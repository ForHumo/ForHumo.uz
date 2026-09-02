// O'zbekiston Markaziy banki (CBU) USD/UZS kursi.
// API: https://cbu.uz/oz/arkhiv-kursov-valyut/json/USD/
// Kunlik yangilanadi. 6 soat cache (memory).
// Xato bo'lsa fallback: env USD_UZS_RATE (default 12900).

interface CachedRate {
    rate: number;
    fetchedAt: number;
}

let cache: CachedRate | null = null;
const CACHE_TTL_MS = 6 * 3600 * 1000; // 6 soat

/** CBU API'dan bugungi USD/UZS kursini oladi. Cache TTL 6 soat. Fail-safe. */
export async function getUsdUzsRate(): Promise<number> {
    // Cache'da bo'lsa
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.rate;
    }

    const fallback = Math.max(1000, Math.floor(Number(process.env.USD_UZS_RATE ?? "12900")));

    try {
        const r = await fetch("https://cbu.uz/oz/arkhiv-kursov-valyut/json/USD/", {
            // Next.js server-side cache (backup)
            next: { revalidate: 21600 },
        });
        if (!r.ok) throw new Error(`cbu ${r.status}`);
        const data = await r.json();
        // Format: [{ "Ccy": "USD", "Rate": "11830.15", ... }]
        const usd = Array.isArray(data) ? data.find((x: { Ccy: string }) => x.Ccy === "USD") : null;
        const rateStr = usd?.Rate;
        const rate = rateStr ? Math.round(Number(rateStr)) : fallback;
        if (!rate || rate < 5000 || rate > 100000) throw new Error("invalid_rate");
        cache = { rate, fetchedAt: Date.now() };
        return rate;
    } catch {
        // Xato bo'lsa cache'ni yangilamaymiz, fallback qaytaramiz
        if (cache) return cache.rate;
        return fallback;
    }
}

/** Cache'ni majburiy tozalash (test yoki admin uchun). */
export function clearRateCache() {
    cache = null;
}
