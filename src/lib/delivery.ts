// Yetkazib berish narxi va davomiyligini hisoblash — hozirgi kunda oddiy joylashuvga
// asoslangan tarifa. Kelajakda Yandex Delivery / BTS Express / Uzum Tezkor API ulanadi.
//
// Env: YANDEX_DELIVERY_TOKEN (bo'sh bo'lsa lokal narx hisoblanadi).

export interface DeliveryQuote {
    provider: "local" | "yandex" | "bts";
    price: number;              // UZS
    etaMinutes: number;         // taxminiy vaqt
    freeThreshold?: number;     // shu summadan ortiq buyurtma bepul (agar bo'lsa)
}

// Toshkent shahri ichida standart tarifa (real Yandex bo'lmaganida)
const CITY_BASE_PRICE = 20000;
const CITY_FREE_THRESHOLD = 300000;

// Boshqa hududlar — masofa tarifa
const REGION_BASE_PRICE = 40000;

// Hozircha manzil matndan shahar aniqlanadi (regex — real geocoding keyingi bosqichda)
function isTashkent(address: string): boolean {
    return /toshkent|tashkent|ташкент/i.test(address);
}

export async function getDeliveryQuote(address: string, subtotal: number): Promise<DeliveryQuote> {
    // Real Yandex Delivery API — kalit mavjud bo'lsa
    if (process.env.YANDEX_DELIVERY_TOKEN) {
        try {
            // TODO: Yandex Go Business API — https://yandex.ru/support/dostavka-api/
            // Hozircha: fallback lokal (kelajakda POST yubor va real quote ol)
        } catch { /* fallback */ }
    }

    if (isTashkent(address)) {
        return {
            provider: "local",
            price: subtotal >= CITY_FREE_THRESHOLD ? 0 : CITY_BASE_PRICE,
            etaMinutes: 60,
            freeThreshold: CITY_FREE_THRESHOLD,
        };
    }
    // Viloyat — 1-3 kun, tarifa qat'iy
    return { provider: "local", price: REGION_BASE_PRICE, etaMinutes: 60 * 24 * 2 };
}
