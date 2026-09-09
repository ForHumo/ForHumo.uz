// Mahsulot kategoriyasi bo'yicha o'rtacha yaroqlilik muddati (kun).
// BnPurchase.expiresAt hisoblash uchun ishlatiladi (agar sotuvchi kiritmasa).

const SHELF_DAYS_BY_KEYWORD: Array<{ match: RegExp; days: number }> = [
    // Tez buziluvchi
    { match: /\b(sut|молок|молочн|milk|yogurt|smetana|kefir|nordost|tvorog)\b/i, days: 5 },
    { match: /\b(non|xleb|nan|bread|булк|лепёш)\b/i, days: 3 },
    { match: /\b(go['ʼ]?sht|мясо|meat|tovuq|курица|chicken|beef|mol|qo['ʼ]?y)\b/i, days: 2 },
    { match: /\b(baliq|рыб|fish|krevetka|kalmar)\b/i, days: 2 },
    { match: /\b(pomidor|помидор|tomat|огурц|bodring|cucumber|salat|укроп|kinza|petrushka)\b/i, days: 5 },
    { match: /\b(banan|banan|banana|яблок|olma|apple|груш|nok|apelsin|апельсин|orange|limon)\b/i, days: 7 },
    { match: /\b(tuxum|яйц|egg|pishloq|сыр|cheese|maslo|масло|butter|smetana)\b/i, days: 14 },
    // O'rtacha
    { match: /\b(guruch|рис|rice|makaron|манти|макарон|pasta|un|мука|flour|shakar|сахар|sugar|tuz|соль|salt)\b/i, days: 180 },
    { match: /\b(choy|чай|tea|kofe|кофе|coffee|shokolad|шоколад|konfeta|конфет|pechene|печен)\b/i, days: 180 },
    // Konserva/uzoq
    { match: /\b(konserva|консерв|тушен|paштет|marinov|мед|asal|honey|jem|варен|jam)\b/i, days: 365 },
    // Ichimlik
    { match: /\b(suv|вода|water|kola|coca|pepsi|sok|сок|juice|napitok|напитк)\b/i, days: 60 },
];

/**
 * Mahsulot nomi/kategoriya asosida taxminiy sro'g'ni qaytaradi.
 * Topilmasa null — reminder yuborilmaydi.
 */
export function estimateShelfDays(title: string, categorySlug?: string | null): number | null {
    const text = `${title} ${categorySlug ?? ""}`;
    for (const { match, days } of SHELF_DAYS_BY_KEYWORD) {
        if (match.test(text)) return days;
    }
    return null;
}

/** purchasedAt + estimateShelfDays → expiresAt Date | null */
export function estimateExpiresAt(title: string, categorySlug: string | null | undefined, purchasedAt: Date): Date | null {
    const days = estimateShelfDays(title, categorySlug);
    if (days === null) return null;
    return new Date(purchasedAt.getTime() + days * 24 * 60 * 60 * 1000);
}
