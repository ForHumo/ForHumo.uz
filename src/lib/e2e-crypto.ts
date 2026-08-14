// End-to-end shifrlash — Web Crypto API (ECDH P-256 + AES-256-GCM).
//
// Ish uslubi (WhatsApp/Signal soddalashtirilgan naqsh):
//   1. Har foydalanuvchi bir identity key pair yaratadi (private → IndexedDB, public → server).
//   2. A → B xabar yozayotganda:
//      - A ephemeral key pair yaratadi
//      - shared_secret = ECDH(A_ephemeral_private, B_identity_public)
//      - HKDF orqali AES kalit derive
//      - AES-GCM bilan xabar shifrlash
//      - Yuborish: { ephemeralPub, iv, ciphertext, senderKeyId }
//   3. B qabul qilganda:
//      - shared_secret = ECDH(B_identity_private, A_ephemeral_public)
//      - HKDF + AES-GCM decrypt
//
// Xavfsizlik cheklovlari (bu MVP):
//   - "Perfect Forward Secrecy" — har xabar ephemeral kalit bilan (yaxshi)
//   - Multi-device — hozir 1 kalit/foydalanuvchi (Signal-style ratchet keyingi bosqichda)
//   - Private key backup yo'q — yangi qurilmada oldingi xabarlar deshifrlanmaydi

const KEY_USAGES: KeyUsage[] = ["deriveBits", "deriveKey"];
const ECDH_PARAMS = { name: "ECDH" as const, namedCurve: "P-256" as const };

// ---- Base64 helpers ----
function bufToB64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
function b64ToBuf(b64: string): ArrayBuffer {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
}

// ---- Identity key pair (SPKI public + JWK private) ----
export interface IdentityKeyPair {
    publicKey:  string;          // SPKI DER, base64
    privateJwk: JsonWebKey;      // client-only, IndexedDB'ga saqlanadi
    fingerprint: string;         // SHA-256(publicKey) 8 baytli qisqartma (hex, 16 belgi)
}

export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
    const pair = await crypto.subtle.generateKey(ECDH_PARAMS, true, KEY_USAGES);
    const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
    const jwk  = await crypto.subtle.exportKey("jwk",  pair.privateKey);
    const fp   = await computeFingerprint(bufToB64(spki));
    return { publicKey: bufToB64(spki), privateJwk: jwk, fingerprint: fp };
}

export async function computeFingerprint(publicKeyB64: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", b64ToBuf(publicKeyB64));
    // Foydalanuvchi tekshirishi uchun (Signal safety numbers uslub) — 8 bayt hex + guruh
    const bytes = new Uint8Array(digest).slice(0, 8);
    let hex = "";
    for (const b of bytes) hex += b.toString(16).padStart(2, "0");
    // "AB CD EF 12 · 34 56 78 90" ko'rinishida
    return hex.toUpperCase().match(/.{4}/g)!.join(" ");
}

// ---- Encrypt: A (yuboruvchi) → B (qabul qiluvchi) ----
export interface EncryptedPayload {
    ephemeralPub: string;   // A ning yangi bir marta kaliti (SPKI b64)
    iv: string;             // 12 bayt (base64)
    ciphertext: string;     // AES-GCM shifr matn (base64)
    v: number;              // format versiyasi (1)
}

async function importRecipientPublic(spkiB64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey("spki", b64ToBuf(spkiB64), ECDH_PARAMS, false, []);
}

async function deriveAesKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    // ECDH orqali 256-bit derive → AES-GCM 256 kalit
    return crypto.subtle.deriveKey(
        { name: "ECDH", public: publicKey },
        privateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

export async function encryptForRecipient(recipientPublicKeyB64: string, plaintext: string): Promise<EncryptedPayload> {
    // Ephemeral key pair (bu xabar uchun bir marta)
    const eph = await crypto.subtle.generateKey(ECDH_PARAMS, true, KEY_USAGES);
    const recipientPub = await importRecipientPublic(recipientPublicKeyB64);
    const aesKey = await deriveAesKey(eph.privateKey, recipientPub);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        new TextEncoder().encode(plaintext),
    );
    const ephSpki = await crypto.subtle.exportKey("spki", eph.publicKey);
    return {
        ephemeralPub: bufToB64(ephSpki),
        iv:           bufToB64(iv.buffer),
        ciphertext:   bufToB64(ct),
        v:            1,
    };
}

export async function decryptFromSender(myPrivateJwk: JsonWebKey, payload: EncryptedPayload): Promise<string> {
    if (payload.v !== 1) throw new Error(`Noma'lum format versiyasi: ${payload.v}`);
    const myPrivate = await crypto.subtle.importKey("jwk", myPrivateJwk, ECDH_PARAMS, false, KEY_USAGES);
    const senderEphPub = await importRecipientPublic(payload.ephemeralPub);
    const aesKey = await deriveAesKey(myPrivate, senderEphPub);
    const iv = b64ToBuf(payload.iv);
    const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        b64ToBuf(payload.ciphertext),
    );
    return new TextDecoder().decode(plain);
}

// ---- Passphrase-asosli backup (multi-device eksport / import) ----
//
// PBKDF2-SHA256 (200k iters, 16-bayt salt) → AES-256-GCM. Foydalanuvchi passphrase
// yodlab qo'yadi (yoki xavfsiz joyda saqlaydi). Backup string (base64) boshqa
// qurilmaga import qilinsa — private key va identity qayta tiklanadi.
//
// Format (JSON, keyin base64):
//   { v:1, salt: b64, iv: b64, ct: b64 }
// ct = AES-GCM(passKey, JSON({ privateJwk, publicKey, fingerprint }))

const PBKDF2_ITERS = 200_000;
const BACKUP_V = 1;

interface BackupEnvelope { v: number; salt: string; iv: string; ct: string }
interface BackupInner { privateJwk: JsonWebKey; publicKey: string; fingerprint: string }

async function deriveBackupKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
    const base = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(passphrase),
        { name: "PBKDF2" }, false, ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

export async function exportBackup(inner: BackupInner, passphrase: string): Promise<string> {
    if (!passphrase || passphrase.length < 8) throw new Error("Passphrase kamida 8 belgi bo'lsin");
    const saltBuf = new ArrayBuffer(16);
    crypto.getRandomValues(new Uint8Array(saltBuf));
    const ivBuf = new ArrayBuffer(12);
    crypto.getRandomValues(new Uint8Array(ivBuf));
    const key  = await deriveBackupKey(passphrase, saltBuf);
    const pt   = new TextEncoder().encode(JSON.stringify(inner));
    const ct   = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBuf }, key, pt);
    const env: BackupEnvelope = {
        v:  BACKUP_V,
        salt: bufToB64(saltBuf),
        iv:   bufToB64(ivBuf),
        ct:   bufToB64(ct),
    };
    return btoa(JSON.stringify(env));
}

export async function importBackup(backupB64: string, passphrase: string): Promise<BackupInner> {
    let env: BackupEnvelope;
    try { env = JSON.parse(atob(backupB64.trim())); }
    catch { throw new Error("Backup formati noto'g'ri"); }
    if (env.v !== BACKUP_V) throw new Error(`Noma'lum backup versiyasi: ${env.v}`);
    const salt = b64ToBuf(env.salt);
    const iv   = b64ToBuf(env.iv);
    const key  = await deriveBackupKey(passphrase, salt);
    let pt: ArrayBuffer;
    try {
        pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, b64ToBuf(env.ct));
    } catch {
        throw new Error("Passphrase noto'g'ri yoki backup buzilgan");
    }
    return JSON.parse(new TextDecoder().decode(pt)) as BackupInner;
}
