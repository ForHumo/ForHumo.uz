// End-to-End shifrlash yordamchilari (Signal/WhatsApp uslub).
// Algoritm: ECDH P-256 (Web Crypto SPKI base64) + HKDF-SHA256 + AES-256-GCM.
//
// Xavfsizlik:
//   - Private key HECH QACHON server'ga jo'natilmaydi — IndexedDB'da saqlanadi
//   - Public key server'da UserE2eKey jadvalida saqlanadi (fingerprint bilan)
//   - Har xabar uchun yangi ephemeral IV
//
// TODO (kelajakda): forward secrecy uchun ephemeral kalit juftlik har xabar uchun.

const KEY_ALGO = "ECDH-P256";
const AES_ALGO = { name: "AES-GCM", length: 256 } as const;
const AES_TAG_LENGTH = 128;

// ─────────────────────────────────────────────────────────────────────────────
// Kalit yaratish + eksport/import
// ─────────────────────────────────────────────────────────────────────────────

export async function generateKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
    const kp = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true, // extractable — public/private ikkalasi ham
        ["deriveKey", "deriveBits"],
    );
    return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("spki", publicKey);
    return arrayBufferToBase64(raw);
}

export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    const raw = base64ToArrayBuffer(publicKeyBase64);
    return crypto.subtle.importKey(
        "spki", raw,
        { name: "ECDH", namedCurve: "P-256" },
        true, [],
    );
}

// Private key IndexedDB'da saqlash uchun CryptoKey ni JWK'ga eksport qilamiz
// (non-extractable qo'yilsa xavfsizroq lekin backup imkonsiz).
export async function exportPrivateKey(privateKey: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey("jwk", privateKey);
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "jwk", jwk,
        { name: "ECDH", namedCurve: "P-256" },
        true, ["deriveKey", "deriveBits"],
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fingerprint — public key'ning inson o'qish uchun qisqartmasi
// ─────────────────────────────────────────────────────────────────────────────

export async function computeFingerprint(publicKeyBase64: string): Promise<string> {
    const data = new TextEncoder().encode(publicKeyBase64);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return arrayBufferToHex(hash).slice(0, 40);
}

// ─────────────────────────────────────────────────────────────────────────────
// ECDH + shifrlash
// ─────────────────────────────────────────────────────────────────────────────

// Shared secret'dan AES-GCM kaliti hosil qilish (HKDF).
async function deriveAesKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
        { name: "ECDH", public: peerPublicKey },
        privateKey,
        AES_ALGO,
        false, // non-extractable — chiqarib bo'lmaydi
        ["encrypt", "decrypt"],
    );
}

export type E2ePayload = {
    v: 1;                    // versiya
    iv: string;              // base64 (12 bayt)
    ct: string;              // base64 shifrlangan matn
    senderKeyId: string;     // yuboruvchining kaliti ID (UserE2eKey.id)
};

export async function encryptMessage(
    plaintext: string,
    myPrivateKey: CryptoKey,
    peerPublicKey: CryptoKey,
    senderKeyId: string,
): Promise<E2ePayload> {
    const aesKey = await deriveAesKey(myPrivateKey, peerPublicKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ct = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as BufferSource, tagLength: AES_TAG_LENGTH },
        aesKey, encoded as BufferSource,
    );
    return {
        v: 1,
        iv: uint8ToBase64(iv),
        ct: arrayBufferToBase64(ct),
        senderKeyId,
    };
}

export async function decryptMessage(
    payload: E2ePayload,
    myPrivateKey: CryptoKey,
    peerPublicKey: CryptoKey,
): Promise<string> {
    if (payload.v !== 1) throw new Error("E2E versiya qo'llanmaydi");
    const aesKey = await deriveAesKey(myPrivateKey, peerPublicKey);
    const iv = base64ToUint8(payload.iv);
    const ct = base64ToArrayBuffer(payload.ct);
    const pt = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as BufferSource, tagLength: AES_TAG_LENGTH },
        aesKey, ct,
    );
    return new TextDecoder().decode(pt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Base64 <-> ArrayBuffer helper'lar (Web Crypto standart formatlar)
// ─────────────────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function uint8ToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

function base64ToUint8(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function arrayBufferToHex(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
}

export function detectDeviceLabel(): string {
    if (typeof navigator === "undefined") return "Noma'lum";
    const ua = navigator.userAgent;
    let browser = "Brauzer";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    let os = "OS";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "Mac";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";
    return `${browser} · ${os}`;
}
