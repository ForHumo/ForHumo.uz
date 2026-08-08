// Ulgurji (B2B) — narx pog'onasi hisoblovchi + min qty tekshiruvi.
// Har mahsulot: {isWholesale, minWholesaleQty, wholesaleTiers}
// wholesaleTiers = [{minQty:20,price:8000},{minQty:50,price:7500}] — DESC sort.

export type WholesaleTier = { minQty: number; price: number };

// JSON'dan xavfsiz o'qish (yomon ma'lumot bo'lsa bo'sh massiv)
export function parseTiers(raw: unknown): WholesaleTier[] {
    if (!Array.isArray(raw)) return [];
    const tiers: WholesaleTier[] = [];
    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const t = item as Record<string, unknown>;
        const minQty = Number(t.minQty);
        const price = Number(t.price);
        if (Number.isFinite(minQty) && minQty > 0 && Number.isFinite(price) && price > 0) {
            tiers.push({ minQty: Math.floor(minQty), price: Math.floor(price) });
        }
    }
    // minQty bo'yicha o'sish tartibida
    tiers.sort((a, b) => a.minQty - b.minQty);
    return tiers;
}

// Ulgurji mahsulot uchun berilgan miqdorda birlik narx.
// Tier yo'q bo'lsa base price qaytadi.
export function priceForQty(basePrice: number, tiers: WholesaleTier[], qty: number): number {
    if (!tiers.length) return basePrice;
    let chosen = basePrice;
    for (const t of tiers) {
        if (qty >= t.minQty) chosen = t.price;
        else break;
    }
    return chosen;
}

// Ulgurji uchun majburiy min qty. Berilmagan bo'lsa 1.
export function minQtyForProduct(isWholesale: boolean, minWholesaleQty: number | null): number {
    if (!isWholesale) return 1;
    return Math.max(1, Number(minWholesaleQty) || 1);
}

// Foydalanuvchiga chiroyli ko'rsatish uchun tier ro'yxati
export function formatTiers(tiers: WholesaleTier[]): string[] {
    return tiers.map((t, i) => {
        const next = tiers[i + 1];
        if (next) return `${t.minQty}-${next.minQty - 1} dona: ${t.price.toLocaleString("uz-UZ")} so'm`;
        return `${t.minQty}+ dona: ${t.price.toLocaleString("uz-UZ")} so'm`;
    });
}
