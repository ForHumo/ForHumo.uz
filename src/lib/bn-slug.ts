// BN slug generatori — do'kon va mahsulot uchun.
// Kirill/o'zbek harflarni lotinga, bo'sh joyni tireni, kichik harflarga.

const MAP: Record<string, string> = {
    // Uzbek/latin harfli belgilar
    "ʻ": "", "'": "", "‘": "", "’": "",
    "ў": "o", "Ў": "o", "қ": "q", "Қ": "q", "ғ": "g", "Ғ": "g", "ҳ": "h", "Ҳ": "h",
    // Kirill
    "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"j","з":"z","и":"i","й":"y",
    "к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f",
    "х":"x","ц":"ts","ч":"ch","ш":"sh","щ":"sh","ъ":"","ы":"i","ь":"","э":"e","ю":"yu","я":"ya",
};

export function slugify(input: string, maxLen = 60): string {
    const lower = String(input || "").toLowerCase();
    const transliterated = [...lower].map(ch => MAP[ch] ?? ch).join("");
    return transliterated
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, maxLen)
        || "item";
}

/** Slug'ni takrorlamaslik uchun sanoq qo'shadi (my-shop, my-shop-2, ...). */
export async function uniqueSlug(
    base: string,
    isTaken: (s: string) => Promise<boolean>,
): Promise<string> {
    let s = slugify(base);
    if (!(await isTaken(s))) return s;
    for (let i = 2; i < 100; i++) {
        const cand = `${s}-${i}`;
        if (!(await isTaken(cand))) return cand;
    }
    // Fallback — random 4 harf
    return `${s}-${Math.random().toString(36).slice(2, 6)}`;
}
