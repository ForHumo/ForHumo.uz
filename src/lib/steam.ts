// Steam OpenID 2.0 integratsiyasi — FAQAT identity linking uchun.
// MUHIM: Bu login EMAS. Auth Google-only qoladi (CLAUDE.md qoidasi).
// Foydalanuvchi Google orqali kirgan, keyin Steam akkauntini bog'laydi.
// Extract qilinadi: SteamID64 (17 raqamli). Ixtiyoriy: STEAM_API_KEY bilan
// persona (nick) + avatar Web API'dan olinadi.

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

// Public base URL (return-to hisoblanadi)
function baseUrl(): string {
    const raw = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://forhumo.uz";
    return raw.replace(/\/+$/, "");
}

// Steam OpenID login URL (foydalanuvchi shu yerga yo'naltiriladi)
export function buildSteamAuthUrl(returnTo: string): string {
    const url = baseUrl();
    const params = new URLSearchParams({
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": `${url}${returnTo}`,
        "openid.realm": url,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });
    return `${STEAM_OPENID_URL}?${params.toString()}`;
}

// Callback URL'dan kelgan parametrlarni Steam bilan verify qilamiz (check_authentication).
// Muvaffaqiyat bo'lsa — SteamID64 qaytadi; aks holda null.
export async function verifySteamCallback(searchParams: URLSearchParams): Promise<string | null> {
    // Mode "id_res" bo'lishi shart
    if (searchParams.get("openid.mode") !== "id_res") return null;
    const claimedId = searchParams.get("openid.claimed_id") || "";
    // "https://steamcommunity.com/openid/id/<STEAMID64>"
    const match = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
    if (!match) return null;
    const steamId64 = match[1];

    // Signature verification: check_authentication so'rovi
    const body = new URLSearchParams();
    for (const [k, v] of searchParams.entries()) body.set(k, v);
    body.set("openid.mode", "check_authentication");

    try {
        const res = await fetch(STEAM_OPENID_URL, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });
        const text = await res.text();
        // Javob shaklida "is_valid:true" qatori bo'lishi kerak
        const valid = /is_valid\s*:\s*true/i.test(text);
        return valid ? steamId64 : null;
    } catch {
        return null;
    }
}

// Ixtiyoriy: STEAM_API_KEY bo'lsa — persona (nick) + avatar olib kelamiz.
// Kalit yo'q bo'lsa — jimgina null qaytariladi (identity link baribir ishlaydi).
export async function fetchSteamProfile(steamId64: string): Promise<{ persona: string | null; avatar: string | null }> {
    const key = process.env.STEAM_API_KEY;
    if (!key) return { persona: null, avatar: null };
    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId64}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return { persona: null, avatar: null };
        const data = await res.json() as { response?: { players?: Array<{ personaname?: string; avatarfull?: string }> } };
        const p = data.response?.players?.[0];
        return { persona: p?.personaname ?? null, avatar: p?.avatarfull ?? null };
    } catch {
        return { persona: null, avatar: null };
    }
}

// --- Integritet signallari (STEAM_API_KEY kerak) ---
// HALOL: bular "cheater emas"ni isbotlamaydi — faqat ban / akkaunt yoshi / o'yin egaligi
// signalini beradi. Kalit yo'q bo'lsa barcha funksiya null qaytaradi (stub rejim).

export function steamApiAvailable(): boolean {
    return !!process.env.STEAM_API_KEY;
}

// GetPlayerBans — VAC / game / economy ban holati (ochiq, ishonchli).
export async function fetchSteamBans(steamId64: string): Promise<{
    vacBanned: boolean; numberOfVacBans: number; numberOfGameBans: number;
    daysSinceLastBan: number; economyBan: string; communityBanned: boolean;
} | null> {
    const key = process.env.STEAM_API_KEY;
    if (!key) return null;
    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${key}&steamids=${steamId64}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json() as { players?: Array<{ VACBanned?: boolean; NumberOfVACBans?: number; NumberOfGameBans?: number; DaysSinceLastBan?: number; EconomyBan?: string; CommunityBanned?: boolean }> };
        const p = data.players?.[0];
        if (!p) return null;
        return {
            vacBanned: !!p.VACBanned,
            numberOfVacBans: p.NumberOfVACBans ?? 0,
            numberOfGameBans: p.NumberOfGameBans ?? 0,
            daysSinceLastBan: p.DaysSinceLastBan ?? 0,
            economyBan: p.EconomyBan ?? "none",
            communityBanned: !!p.CommunityBanned,
        };
    } catch { return null; }
}

// GetPlayerSummaries (to'liq) — akkaunt yoshi (timecreated faqat ochiq profilda) + ko'rinish.
export async function fetchSteamSummaryFull(steamId64: string): Promise<{
    persona: string | null; avatar: string | null; timeCreated: number | null; isPublic: boolean;
} | null> {
    const key = process.env.STEAM_API_KEY;
    if (!key) return null;
    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId64}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json() as { response?: { players?: Array<{ personaname?: string; avatarfull?: string; timecreated?: number; communityvisibilitystate?: number }> } };
        const p = data.response?.players?.[0];
        if (!p) return null;
        return {
            persona: p.personaname ?? null,
            avatar: p.avatarfull ?? null,
            timeCreated: p.timecreated ?? null,
            isPublic: p.communityvisibilitystate === 3,
        };
    } catch { return null; }
}

// GetOwnedGames — berilgan appId egaligini + o'ynalgan soatni tekshiradi.
// Profil "game details" yopiq bo'lsa `games` qaytmaydi → visible:false.
export async function fetchSteamOwnership(steamId64: string, appId: number): Promise<{
    owns: boolean; playtimeHours: number | null; visible: boolean;
} | null> {
    const key = process.env.STEAM_API_KEY;
    if (!key) return null;
    try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${steamId64}&include_played_free_games=1&format=json`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json() as { response?: { games?: Array<{ appid: number; playtime_forever?: number }> } };
        const games = data.response?.games;
        if (!games) return { owns: false, playtimeHours: null, visible: false }; // profil yopiq
        const g = games.find(x => x.appid === appId);
        return {
            owns: !!g,
            playtimeHours: g ? Math.round((g.playtime_forever ?? 0) / 60) : 0,
            visible: true,
        };
    } catch { return null; }
}
