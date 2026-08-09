// Klient-yon sevimlilar keshi — barcha ID'lar bir marta yuklanadi.
// bn-product-card har biri o'zi so'rov qilmasin (N+1 muammosi).
// Session bo'lmasa bo'sh Set qaytaradi.

let cachedSet: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;
const listeners = new Set<() => void>();

async function loadFromApi(): Promise<Set<string>> {
    try {
        const r = await fetch("/api/bn/favorites/ids");
        if (!r.ok) return new Set();
        const d = await r.json();
        return new Set<string>(Array.isArray(d?.ids) ? d.ids : []);
    } catch {
        return new Set();
    }
}

/** Sevimlilar ID setini oladi (kesh + bir marta yuklash). */
export async function getFavoriteIds(): Promise<Set<string>> {
    if (cachedSet) return cachedSet;
    if (!inflight) {
        inflight = loadFromApi().then(set => {
            cachedSet = set;
            inflight = null;
            listeners.forEach(l => l());
            return set;
        });
    }
    return inflight;
}

/** Bitta ID uchun holat (sync — kesh bo'lsa). Kesh yo'q → undefined. */
export function peekFavorite(id: string): boolean | undefined {
    return cachedSet ? cachedSet.has(id) : undefined;
}

/** Toggle qilingandan keyin optimistik yangilash. */
export function updateFavorite(id: string, favored: boolean) {
    if (!cachedSet) cachedSet = new Set();
    if (favored) cachedSet.add(id);
    else cachedSet.delete(id);
    listeners.forEach(l => l());
}

/** Sessiya o'zgarganda tozalash. */
export function resetFavorites() {
    cachedSet = null;
    inflight = null;
    listeners.forEach(l => l());
}

/** Subscribe (React komponentlari o'zgarishlarni ko'radi). */
export function subscribeFavorites(cb: () => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}
