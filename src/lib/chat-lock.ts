// Chat lock — client-side qulflash tizimi.
// Server bilmaydi; hamma narsa localStorage + memory.
// PIN: SHA-256 hash (salted) saqlanadi.
// Biometric: WebAuthn credential id saqlanadi (browser platform authenticator).
//
// LocalStorage sxemasi:
//   nexus:chat:lock:{convId} = JSON.stringify({ type: "pin" | "biometric", hash?: string, credId?: string })
//
// Session unlock (memory) — sahifa yangilanmagunicha ochiq qoladi.

export type LockKind = "pin" | "biometric";

export interface ChatLockConfig {
    type: LockKind;
    hash?: string;      // pin uchun: SHA-256 hex
    credId?: string;    // biometric: WebAuthn credential id (base64)
}

const LOCK_PREFIX = "nexus:chat:lock:";
const SALT = "forhumo-nexus-v1";     // Application salt (rainbow table himoyasi uchun oddiy)

// Session unlock memory — sahifa jonli bo'lganda ochiq chatlar
const sessionUnlocked = new Set<string>();

function lockKey(convId: string): string {
    return LOCK_PREFIX + convId;
}

// SHA-256 hash (Web Crypto API)
async function sha256Hex(input: string): Promise<string> {
    const enc = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

export async function hashPin(pin: string): Promise<string> {
    return sha256Hex(SALT + ":" + pin);
}

export function getLock(convId: string): ChatLockConfig | null {
    try {
        const raw = localStorage.getItem(lockKey(convId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ChatLockConfig;
        if (parsed.type !== "pin" && parsed.type !== "biometric") return null;
        return parsed;
    } catch { return null; }
}

export function isLocked(convId: string): boolean {
    return getLock(convId) !== null;
}

export function isUnlockedNow(convId: string): boolean {
    return sessionUnlocked.has(convId);
}

export async function setPinLock(convId: string, pin: string): Promise<void> {
    if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN 4-6 raqam bo'lishi kerak");
    const hash = await hashPin(pin);
    localStorage.setItem(lockKey(convId), JSON.stringify({ type: "pin", hash }));
    sessionUnlocked.add(convId);     // Yaratilgach ochiq
}

export function removeLock(convId: string): void {
    localStorage.removeItem(lockKey(convId));
    sessionUnlocked.delete(convId);
}

export async function verifyPin(convId: string, pin: string): Promise<boolean> {
    const cfg = getLock(convId);
    if (!cfg || cfg.type !== "pin" || !cfg.hash) return false;
    const check = await hashPin(pin);
    // Constant-time compare (short strings, timing farq minimal)
    if (check.length !== cfg.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < check.length; i++) {
        diff |= check.charCodeAt(i) ^ cfg.hash.charCodeAt(i);
    }
    if (diff === 0) {
        sessionUnlocked.add(convId);
        return true;
    }
    return false;
}

// WebAuthn — platform authenticator (Touch ID / Face ID / Windows Hello / fingerprint)
// Ko'p brauzerlarda hozir mavjud.
export function biometricAvailable(): boolean {
    return typeof window !== "undefined"
        && typeof PublicKeyCredential !== "undefined"
        && typeof crypto?.subtle !== "undefined";
}

// Yangi biometric lock yaratish — foydalanuvchi qurilma biometric prompt'ini o'tadi.
// User handle sifatida convId ishlatiladi (per-chat credential).
export async function setBiometricLock(convId: string): Promise<void> {
    if (!biometricAvailable()) throw new Error("Biometrik qurilma qo'llab-quvvatlamaydi");
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(convId);
    const cred = await navigator.credentials.create({
        publicKey: {
            challenge,
            rp: { name: "ForHumo Nexus" },
            user: {
                id: userIdBytes,
                name: `chat-${convId.slice(0, 8)}`,
                displayName: "Nexus Chat Lock",
            },
            pubKeyCredParams: [
                { type: "public-key", alg: -7 },      // ES256
                { type: "public-key", alg: -257 },    // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
                residentKey: "preferred",
            },
            timeout: 60_000,
            attestation: "none",
        },
    }) as PublicKeyCredential | null;
    if (!cred) throw new Error("Yaratib bo'lmadi");
    const credId = arrayBufferToBase64(cred.rawId);
    localStorage.setItem(lockKey(convId), JSON.stringify({ type: "biometric", credId }));
    sessionUnlocked.add(convId);
}

export async function verifyBiometric(convId: string): Promise<boolean> {
    if (!biometricAvailable()) return false;
    const cfg = getLock(convId);
    if (!cfg || cfg.type !== "biometric" || !cfg.credId) return false;
    try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const credIdBytes = base64ToArrayBuffer(cfg.credId);
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge,
                allowCredentials: [{
                    id: credIdBytes, type: "public-key",
                    transports: ["internal"],
                }],
                userVerification: "required",
                timeout: 60_000,
            },
        }) as PublicKeyCredential | null;
        if (!assertion) return false;
        sessionUnlocked.add(convId);
        return true;
    } catch { return false; }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let str = "";
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
}

// Sessiyani majburiy tozalash (masalan chiqish yoki qulflash tugmasi)
export function lockNow(convId: string): void {
    sessionUnlocked.delete(convId);
}

export function lockAllNow(): void {
    sessionUnlocked.clear();
}
