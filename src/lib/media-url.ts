// Media URL validatsiyasi — yuklangan media faqat haqiqiy https URL bo'lsin.
// `javascript:`, `data:`, ixtiyoriy satr yoki noto'g'ri qiymatlarni to'sadi.
// Vercel Blob hozirgi domeni; kelajakda o'zgarsa ham https tekshiruvi asos bo'lib qoladi.

export function isValidMediaUrl(u: unknown): u is string {
    if (typeof u !== "string") return false;
    const s = u.trim();
    if (!s || s.length > 2000) return false;
    let url: URL;
    try {
        url = new URL(s);
    } catch {
        return false;
    }
    return url.protocol === "https:";
}

// Massiv media (post/kanal): faqat yaroqli https URL'larni qoldiradi, maks. `max` ta.
export function filterMediaUrls(arr: unknown, max: number): string[] {
    if (!Array.isArray(arr)) return [];
    return arr.filter(isValidMediaUrl).slice(0, max);
}
