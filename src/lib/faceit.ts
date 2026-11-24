// Faceit Open Data API — o'yinchi Elo + ban holati. FAQAT server tomonda (FACEIT_API_KEY).
// Kalit yo'q bo'lsa barcha funksiya null qaytaradi (stub rejim — jonli kod o'zgarmaydi).
// Hujjat: https://docs.faceit.com/docs (Data API v4, Bearer auth).

const FACEIT_BASE = "https://open.faceit.com/data/v4";

export function faceitAvailable(): boolean {
    return !!process.env.FACEIT_API_KEY;
}

function authHeaders(): Record<string, string> | null {
    const key = process.env.FACEIT_API_KEY;
    if (!key) return null;
    return { Authorization: `Bearer ${key}` };
}

// EsGame.slug → Faceit game id
const FACEIT_GAMES: Record<string, string> = {
    cs2: "cs2", "counter-strike-2": "cs2",
    csgo: "csgo", "counter-strike": "csgo",
    dota2: "dota2", dota: "dota2", "dota-2": "dota2",
};
export function faceitGameForSlug(slug: string): string | undefined {
    return FACEIT_GAMES[slug.toLowerCase()];
}

// Nick bo'yicha o'yinchini topadi + berilgan o'yin uchun Elo/level.
export async function fetchFaceitByNickname(nickname: string, game?: string): Promise<{
    playerId: string; nickname: string; elo: number | null; skillLevel: number | null;
} | null> {
    const headers = authHeaders();
    if (!headers) return null;
    try {
        const url = `${FACEIT_BASE}/players?nickname=${encodeURIComponent(nickname)}${game ? `&game=${encodeURIComponent(game)}` : ""}`;
        const res = await fetch(url, { headers, cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json() as { player_id?: string; nickname?: string; games?: Record<string, { faceit_elo?: number; skill_level?: number }> };
        if (!data.player_id) return null;
        const g = game && data.games ? data.games[game] : undefined;
        return {
            playerId: data.player_id,
            nickname: data.nickname ?? nickname,
            elo: g?.faceit_elo ?? null,
            skillLevel: g?.skill_level ?? null,
        };
    } catch { return null; }
}

// Ban holati: aktiv ban bo'lsa true, yo'q bo'lsa false, olib bo'lmasa null.
export async function fetchFaceitBans(playerId: string): Promise<boolean | null> {
    const headers = authHeaders();
    if (!headers) return null;
    try {
        const url = `${FACEIT_BASE}/players/${encodeURIComponent(playerId)}/bans`;
        const res = await fetch(url, { headers, cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json() as { items?: Array<{ ends_at?: string | null }> };
        const items = data.items ?? [];
        if (items.length === 0) return false;
        // ends_at yo'q (abadiy) yoki kelajakda → aktiv ban
        const now = Date.now();
        return items.some(b => !b.ends_at || new Date(b.ends_at).getTime() > now);
    } catch { return null; }
}
