// Valyuta kursi (USD/UZS) — Markaziy Bank JSON API'sidan olinadi.
// Server-side cache: 30 daqiqa. CBU javob bermasa env USD_UZS_RATE, keyin 12900 fallback.
//
// API: https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/  →  [{ Ccy:"USD", Rate:"12900.50", Date:"01.08.2026" }]
// Public, kalit kerak emas. Standard'ga ko'ra 1 USD = X so'm.

export interface FxRate {
    rate: number;         // 1 USD = X UZS
    updatedAt: number;    // Unix ms — cache'ga kirgan vaqt
    source: "cbu" | "env" | "fallback";
}

let cache: FxRate | null = null;
const TTL_MS = 30 * 60 * 1000;

const CBU_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/";

function envRate(): number {
    const r = Number(process.env.USD_UZS_RATE);
    return Number.isFinite(r) && r > 0 ? r : 0;
}

async function fetchCbu(): Promise<number | null> {
    try {
        const r = await fetch(CBU_URL, { headers: { "User-Agent": "ForHumo.uz" }, signal: AbortSignal.timeout(4000) });
        if (!r.ok) return null;
        const data = await r.json() as Array<{ Ccy?: string; Rate?: string }>;
        const usd = Array.isArray(data) ? data.find(d => d.Ccy === "USD") : null;
        const rate = usd?.Rate ? Number(usd.Rate) : NaN;
        return Number.isFinite(rate) && rate > 0 ? rate : null;
    } catch {
        return null;
    }
}

/** Hozirgi USD/UZS kursini olish (30 daq cache). */
export async function getUsdUzsRate(): Promise<FxRate> {
    const now = Date.now();
    if (cache && now - cache.updatedAt < TTL_MS) return cache;

    const fromCbu = await fetchCbu();
    if (fromCbu) {
        cache = { rate: fromCbu, updatedAt: now, source: "cbu" };
        return cache;
    }
    const fromEnv = envRate();
    if (fromEnv) {
        cache = { rate: fromEnv, updatedAt: now, source: "env" };
        return cache;
    }
    cache = { rate: 12900, updatedAt: now, source: "fallback" };
    return cache;
}

/** Cache'ni majburiy tozalash (cron uchun). */
export function invalidateFxCache(): void {
    cache = null;
}
