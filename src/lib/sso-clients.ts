// Humo ID SSO hamkor ilovalar registri.
// Konfiguratsiya env orqali: SSO_CLIENTS = JSON massiv:
//   [{"id":"sevinch","name":"Sevinch Sweets","secret":"<hmac-kalit>","redirects":["https://sevinchsweets.uz/"]}]
// redirects — ruxsat etilgan redirect_uri PREFIKSLARI (ochiq-redirect hujumini oldini oladi).

import { createHmac, timingSafeEqual } from "node:crypto";

export interface SsoClient {
    id: string;
    name: string;
    secret: string;
    redirects: string[];
}

const VALID_SCOPES = ["profile", "email", "nexus"] as const;
export type SsoScope = typeof VALID_SCOPES[number];

let _cache: SsoClient[] | null = null;
function clients(): SsoClient[] {
    if (_cache) return _cache;
    const raw = process.env.SSO_CLIENTS;
    if (!raw) { _cache = []; return _cache; }
    try {
        const arr = JSON.parse(raw);
        _cache = Array.isArray(arr)
            ? arr.filter((c) => c && c.id && c.secret && Array.isArray(c.redirects))
                .map((c) => ({ id: String(c.id), name: String(c.name || c.id), secret: String(c.secret), redirects: c.redirects.map(String) }))
            : [];
    } catch {
        _cache = [];
    }
    return _cache;
}

export function getSsoClient(clientId: string): SsoClient | null {
    return clients().find((c) => c.id === clientId) ?? null;
}

// redirect_uri hamkorning ruxsat etilgan prefikslaridan biriga mos kelishi shart.
export function isAllowedRedirect(client: SsoClient, redirectUri: string): boolean {
    if (!redirectUri) return false;
    return client.redirects.some((p) => redirectUri.startsWith(p));
}

// So'ralgan scope'larni tozalash (faqat ma'lum scope'lar, takrorsiz).
export function sanitizeScopes(scope: string | null | undefined): SsoScope[] {
    const req = (scope || "profile").split(/[\s,]+/).filter(Boolean);
    const out = new Set<SsoScope>(["profile"]); // profile doim bor
    for (const s of req) if ((VALID_SCOPES as readonly string[]).includes(s)) out.add(s as SsoScope);
    return [...out];
}

function safeEq(a: string, b: string): boolean {
    const ba = Buffer.from(a), bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Token-exchange so'rovini hamkor sirini bilishiga ko'ra autentifikatsiya qiladi.
// HMAC (afzal) yoki Bearer; partner-auth.ts bilan bir xil uslub.
export function authSsoClient(req: Request, rawBody: string, clientId: string): SsoClient | null {
    const client = getSsoClient(clientId);
    if (!client) return null;
    const ts = req.headers.get("x-partner-timestamp");
    const sig = req.headers.get("x-partner-signature");
    const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

    if (ts && sig) {
        const n = Number(ts);
        if (Number.isFinite(n) && Math.abs(Date.now() - n) <= 5 * 60 * 1000) {
            const expected = createHmac("sha256", client.secret).update(`${ts}.${rawBody}`).digest("hex");
            if (safeEq(expected, sig)) return client;
        }
    }
    if (bearer && safeEq(bearer, client.secret)) return client;
    return null;
}
