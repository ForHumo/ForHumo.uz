import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey(): Buffer {
    const hex = process.env.LOCATION_ENCRYPTION_KEY;
    if (hex && hex.length >= 64) {
        return Buffer.from(hex.slice(0, 64), "hex");
    }
    // Derive a deterministic 32-byte key from NEXTAUTH_SECRET as fallback
    const secret = process.env.NEXTAUTH_SECRET ?? "dev-only-insecure-key";
    return createHash("sha256").update(`location:${secret}`).digest();
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
