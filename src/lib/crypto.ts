import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Har PII turi uchun alohida kalit derive qilamiz — bir kalit sizib chiqsa
// boshqa maydonlar himoyalangan qoladi (defense in depth).
function getKey(purpose: string = "location"): Buffer {
    const hex = process.env.LOCATION_ENCRYPTION_KEY;
    if (hex && hex.length >= 64) {
        const master = Buffer.from(hex.slice(0, 64), "hex");
        // Master kalit + purpose → derived kalit
        return createHash("sha256").update(master).update(`::${purpose}`).digest();
    }
    // Derive a deterministic 32-byte key from NEXTAUTH_SECRET as fallback
    const secret = process.env.NEXTAUTH_SECRET ?? "dev-only-insecure-key";
    return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

/** Encrypt a plain-text string with AES-256-GCM. Returns { encrypted, iv } as base64. */
export function encryptLocation(plaintext: string): { encrypted: string; iv: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag(); // 16 bytes
    // Store: encrypted + tag concatenated
    return {
        encrypted: Buffer.concat([encrypted, tag]).toString("base64"),
        iv: iv.toString("base64"),
    };
}

/** Decrypt a base64 string previously encrypted with encryptLocation. */
export function decryptLocation(encryptedB64: string, ivB64: string): string {
    try {
        const key = getKey();
        const iv = Buffer.from(ivB64, "base64");
        const combined = Buffer.from(encryptedB64, "base64");
        const tag = combined.subarray(combined.length - 16);
        const data = combined.subarray(0, combined.length - 16);
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    } catch {
        return "";
    }
}

// ── Generic PII encryption (purpose-scoped) ──────────────────────────────
// Har PII maydoni uchun alohida derived kalit — bir kalit sizib chiqsa
// boshqa PII himoyalangan qoladi. Purposelar: "phone", "totp", "birthday", "note".

/** Purpose-scoped AES-256-GCM encrypt. Returns { encrypted, iv } base64. */
export function encryptPII(plaintext: string, purpose: string): { encrypted: string; iv: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", getKey(purpose), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        encrypted: Buffer.concat([encrypted, tag]).toString("base64"),
        iv: iv.toString("base64"),
    };
}

/** Purpose-scoped AES-256-GCM decrypt. Returns "" on any failure (fail-safe). */
export function decryptPII(encryptedB64: string, ivB64: string, purpose: string): string {
    try {
        const key = getKey(purpose);
        const iv = Buffer.from(ivB64, "base64");
        const combined = Buffer.from(encryptedB64, "base64");
        const tag = combined.subarray(combined.length - 16);
        const data = combined.subarray(0, combined.length - 16);
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    } catch {
        return "";
    }
}

// Convenience helpers (backward compat + typed API)
export const encryptPhone = (p: string) => encryptPII(p, "phone");
export const decryptPhone = (enc: string, iv: string) => decryptPII(enc, iv, "phone");
export const encryptTotp  = (s: string) => encryptPII(s, "totp");
export const decryptTotp  = (enc: string, iv: string) => decryptPII(enc, iv, "totp");
