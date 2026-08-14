// TOTP (RFC 6238) — authenticator app 2FA.
// HMAC-SHA1, 6 raqam, 30 soniya oyna, ±1 oyna tolerantlik (soat drift'i uchun).
// Google Authenticator / Authy / 1Password / Microsoft Authenticator — barchasi mos.
//
// Yordamchilar:
//   generateSecretBase32()   — yangi 20-baytli secret, base32-encoded
//   otpauthUri(...)          — QR uchun `otpauth://totp/...` URI
//   verifyTotp(secret, code) — kodni tekshirish (±1 window)
//   generateBackupCodes()    — 8 ta zaxira kod (12-belgi)
//   hashBackupCode(code)     — SHA-256 hex (DB'da hashlangan saqlanadi)

import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DIGITS = 6;
const PERIOD = 30;

function base32Encode(buf: Buffer): string {
    let bits = 0;
    let value = 0;
    let out = "";
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
            bits -= 5;
        }
    }
    if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
    return out;
}

function base32Decode(s: string): Buffer {
    const clean = s.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const ch of clean) {
        const idx = BASE32_ALPHABET.indexOf(ch);
        if (idx < 0) throw new Error("Base32'da noto'g'ri belgi");
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

export function generateSecretBase32(bytes: number = 20): string {
    return base32Encode(crypto.randomBytes(bytes));
}

// RFC 4226 HOTP → RFC 6238 TOTP (counter = floor(unixtime / period))
function hotp(secretBase32: string, counter: number): string {
    const key = base32Decode(secretBase32);
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter >>> 0, 4);
    const hmac = crypto.createHmac("sha1", key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const bin = ((hmac[offset] & 0x7f) << 24)
              | ((hmac[offset + 1] & 0xff) << 16)
              | ((hmac[offset + 2] & 0xff) << 8)
              | (hmac[offset + 3] & 0xff);
    const mod = bin % 10 ** DIGITS;
    return mod.toString().padStart(DIGITS, "0");
}

export function generateTotp(secretBase32: string, atUnixMs: number = Date.now()): string {
    const counter = Math.floor(atUnixMs / 1000 / PERIOD);
    return hotp(secretBase32, counter);
}

// ±window*period tolerantlik (default 1 = ±30s). Constant-time solishtirish.
export function verifyTotp(secretBase32: string, code: string, window: number = 1, atUnixMs: number = Date.now()): boolean {
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) return false;
    const counter = Math.floor(atUnixMs / 1000 / PERIOD);
    for (let d = -window; d <= window; d++) {
        const expected = hotp(secretBase32, counter + d);
        if (timingSafeEqualStr(expected, clean)) return true;
    }
    return false;
}

function timingSafeEqualStr(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
    catch { return false; }
}

export function otpauthUri(opts: {
    secretBase32: string;
    accountName: string;    // masalan foydalanuvchi username yoki email
    issuer?: string;        // "ForHumo.uz"
}): string {
    const issuer = opts.issuer || "ForHumo.uz";
    const label  = `${encodeURIComponent(issuer)}:${encodeURIComponent(opts.accountName)}`;
    const params = new URLSearchParams({
        secret:    opts.secretBase32,
        issuer,
        algorithm: "SHA1",
        digits:    String(DIGITS),
        period:    String(PERIOD),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}

// Zaxira kodlar — 8 ta, format "XXXX-XXXX-XXXX" (crockford-style alifbo, chalkashmaydigan belgilar)
const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I, O, 0, 1 chiqarilgan
export function generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const raw = crypto.randomBytes(9);
        let s = "";
        for (const b of raw) s += BACKUP_ALPHABET[b % BACKUP_ALPHABET.length];
        codes.push(`${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`);
    }
    return codes;
}

export function hashBackupCode(code: string): string {
    const norm = code.replace(/[\s-]/g, "").toUpperCase();
    return crypto.createHash("sha256").update("forhumo-2fa-v1:" + norm).digest("hex");
}

export function verifyBackupCode(code: string, hashedList: string[]): { ok: boolean; usedHash?: string } {
    const target = hashBackupCode(code);
    for (const h of hashedList) {
        if (timingSafeEqualStr(h, target)) return { ok: true, usedHash: h };
    }
    return { ok: false };
}
