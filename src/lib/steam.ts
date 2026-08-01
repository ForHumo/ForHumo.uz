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
