// 2FA sessiya cookie — challenge muvaffaqiyatidan keyin qo'yiladi, sensitive modullar (Nexus, Pay, ID/edit)
// undan ochilishga ruxsat beradi. HMAC-imzolangan (NEXTAUTH_SECRET), profileId + exp bilan bog'langan.
//
// Cookie nomi: "2fa_ok"
// Qiymati:    base64url( { profileId, iat, exp } ) + "." + base64url( hmac_sha256 )

import crypto from "crypto";

const COOKIE_NAME = "fh_2fa_ok";
const DEFAULT_TTL_SEC = 60 * 60 * 24 * 30; // 30 kun — Google session bilan mos

interface Payload { pid: string; iat: number; exp: number }

function b64url(buf: Buffer): string {
    return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
    const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
    return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function secretKey(): Buffer {
    const s = process.env.NEXTAUTH_SECRET || "forhumo-dev-secret-please-set";
    return crypto.createHash("sha256").update("2fa-cookie-v1:" + s).digest();
}

export function sign2faToken(profileId: string, ttlSec: number = DEFAULT_TTL_SEC): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: Payload = { pid: profileId, iat: now, exp: now + ttlSec };
    const payB64 = b64url(Buffer.from(JSON.stringify(payload)));
    const sig    = b64url(crypto.createHmac("sha256", secretKey()).update(payB64).digest());
    return `${payB64}.${sig}`;
}

export function verify2faToken(token: string | undefined | null, expectedProfileId: string): boolean {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payB64, sig] = parts;
    const expected = b64url(crypto.createHmac("sha256", secretKey()).update(payB64).digest());
    if (expected.length !== sig.length) return false;
    try {
        if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
    } catch { return false; }
    try {
        const payload = JSON.parse(b64urlDecode(payB64).toString("utf8")) as Payload;
        if (payload.pid !== expectedProfileId) return false;
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) return false;
        return true;
    } catch { return false; }
}

export const TWO_FA_COOKIE_NAME = COOKIE_NAME;
export const TWO_FA_COOKIE_TTL_SEC = DEFAULT_TTL_SEC;
