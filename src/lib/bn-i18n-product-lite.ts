// BN mahsulot i18n — engil qism (Prisma'siz).
// `bn-data.ts` searchProducts qidiruv variantlarini kengaytirish uchun ishlatadi.
// `bn-i18n-product.ts` — DB'ga yozadigan qismini o'z ichiga oladi.

const RUS_TO_LAT: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "s",
    ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
};
const LAT_TO_RUS: Record<string, string> = {
    a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и",
    j: "ж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ",
    r: "р", s: "с", t: "т", u: "у", v: "в", x: "х", y: "й", z: "з",
};

/**
 * Kirilcha ↔ Lotincha transliteratsiya variantlarini qaytaradi.
 * Qidiruvda "kolbasa" bilan "колбаса" ikkalasini ham topish uchun ishlatiladi.
 * Kelgan matnni ham qaytarmaydi (chaqiruvchi o'zi qo'shadi).
 */
export function transliterate(s: string): string[] {
    if (!s) return [];
    const out: string[] = [];
    const lower = s.toLowerCase();

    // Ru → Lat
    let ruAsLat = "";
    for (const ch of lower) ruAsLat += RUS_TO_LAT[ch] ?? ch;
    if (ruAsLat !== lower) out.push(ruAsLat);

    // Lat → Ru
    let latAsRu = "";
    for (const ch of lower) latAsRu += LAT_TO_RUS[ch] ?? ch;
    if (latAsRu !== lower) out.push(latAsRu);

    return out;
}
