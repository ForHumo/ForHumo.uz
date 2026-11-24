// eSport o'yinchi akkaunt integritet tekshiruvi — Steam / Faceit / Moonton (MLBB).
//
// HALOL CHEGARA: hech qaysi API "bu odam cheater emas"ni isbotlab bermaydi.
// Bu modul signallarni (ban / akkaunt yoshi / o'yin egaligi / Faceit Elo) yig'ib,
// verdikt beradi: TOZA / TEKSHIRISH / BLOK. Jonli anti-cheat = Faceit (kernel AC).
//
// STUB REJIM: tegishli kalit (STEAM_API_KEY / FACEIT_API_KEY) yo'q bo'lsa verdikt
// "TEKSHIRISH" + snapshot.stub=true qaytadi. Kalit qo'yilganda kod o'zgarmasdan jonlaydi.

import {
    steamApiAvailable, fetchSteamBans, fetchSteamSummaryFull, fetchSteamOwnership,
} from "@/lib/steam";
import {
    faceitAvailable, faceitGameForSlug, fetchFaceitByNickname, fetchFaceitBans,
} from "@/lib/faceit";

export type VerifyVerdict = "TOZA" | "TEKSHIRISH" | "BLOK";
export type VerifyPlatform = "STEAM" | "FACEIT" | "MOONTON";

const VERDICT_RANK: Record<VerifyVerdict, number> = { TOZA: 0, TEKSHIRISH: 1, BLOK: 2 };
export function worseVerdict(a: VerifyVerdict, b: VerifyVerdict): VerifyVerdict {
    return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

// --- Chegaralar (sozlanadigan) ---
export const MIN_ACCOUNT_AGE_DAYS = 30;   // undan yosh akkaunt → TEKSHIRISH
export const RECENT_BAN_DAYS = 365;       // shu kun ichidagi VAC/game ban → BLOK
export const MIN_GAME_HOURS = 50;         // o'yin ichida minimal soat (smurf filtri)

// EsGame.slug → Steam appId
const STEAM_APPIDS: Record<string, number> = {
    cs2: 730, csgo: 730, "counter-strike": 730, "counter-strike-2": 730,
    dota2: 570, dota: 570, "dota-2": 570,
};
export function steamAppIdForSlug(slug: string): number | null {
    return STEAM_APPIDS[slug.toLowerCase()] ?? null;
}

export interface SteamSnapshot {
    stub?: boolean;
    checkedAt: string;
    bans?: {
        vacBanned: boolean; numberOfVacBans: number; numberOfGameBans: number;
        daysSinceLastBan: number; economyBan: string; communityBanned: boolean;
    } | null;
    account?: { ageDays: number | null; public: boolean } | null;
    ownership?: { owns: boolean; playtimeHours: number | null; visible: boolean } | null;
    reasons: string[];
}

// Steam akkauntini tekshiradi (appId berilsa o'yin egaligi ham). SteamID64 — OpenID'dan tasdiqlangan.
export async function verifySteam(steamId64: string, appId: number | null): Promise<{
    verdict: VerifyVerdict; snapshot: SteamSnapshot; handle: string | null;
}> {
    const checkedAt = new Date().toISOString();
    if (!steamApiAvailable()) {
        return {
            verdict: "TEKSHIRISH", handle: null,
            snapshot: { stub: true, checkedAt, reasons: ["STEAM_API_KEY yo'q — stub rejim (tekshirib bo'lmadi)"] },
        };
    }

    const [bans, summary, ownership] = await Promise.all([
        fetchSteamBans(steamId64),
        fetchSteamSummaryFull(steamId64),
        appId ? fetchSteamOwnership(steamId64, appId) : Promise.resolve(null),
    ]);

    const reasons: string[] = [];
    let verdict: VerifyVerdict = "TOZA";

    // Ban holati
    if (bans) {
        const hasBan = bans.vacBanned || bans.numberOfGameBans > 0;
        if (hasBan && bans.daysSinceLastBan > 0 && bans.daysSinceLastBan <= RECENT_BAN_DAYS) {
            verdict = worseVerdict(verdict, "BLOK");
            reasons.push(`Yaqinda ban (${bans.daysSinceLastBan} kun oldin; VAC:${bans.numberOfVacBans}, game:${bans.numberOfGameBans})`);
        } else if (hasBan) {
            verdict = worseVerdict(verdict, "TEKSHIRISH");
            reasons.push(`Eski ban tarixi (VAC:${bans.numberOfVacBans}, game:${bans.numberOfGameBans}, ${bans.daysSinceLastBan} kun oldin)`);
        }
        if (bans.economyBan === "banned") {
            verdict = worseVerdict(verdict, "TEKSHIRISH");
            reasons.push("Economy (trade) ban");
        }
    } else {
        verdict = worseVerdict(verdict, "TEKSHIRISH");
        reasons.push("Ban holatini olib bo'lmadi");
    }

    // Akkaunt yoshi + ko'rinish
    let ageDays: number | null = null;
    if (summary) {
        if (!summary.isPublic) {
            verdict = worseVerdict(verdict, "TEKSHIRISH");
            reasons.push("Profil yopiq — to'liq tekshirib bo'lmaydi");
        }
        if (summary.timeCreated) {
            ageDays = Math.floor((Date.now() / 1000 - summary.timeCreated) / 86400);
            if (ageDays < MIN_ACCOUNT_AGE_DAYS) {
                verdict = worseVerdict(verdict, "TEKSHIRISH");
                reasons.push(`Yangi akkaunt (${ageDays} kun)`);
            }
        }
    }

    // O'yin egaligi + soat
    if (ownership) {
        if (!ownership.visible) {
            verdict = worseVerdict(verdict, "TEKSHIRISH");
            reasons.push("O'yin egaligi yopiq (game details profilda yashirin)");
        } else if (!ownership.owns) {
            verdict = worseVerdict(verdict, "TEKSHIRISH");
            reasons.push("Bu o'yin akkauntda ko'rinmadi");
        } else if (ownership.playtimeHours !== null && ownership.playtimeHours < MIN_GAME_HOURS) {
            verdict = worseVerdict(verdict, "TEKSHIRISH");
            reasons.push(`Kam soat (${ownership.playtimeHours}s < ${MIN_GAME_HOURS}s) — smurf shubhasi`);
        }
    }

    if (verdict === "TOZA") reasons.push("Ban yo'q, akkaunt yetarli — toza");

    return {
        verdict,
        handle: summary?.persona ?? null,
        snapshot: {
            checkedAt, bans,
            account: summary ? { ageDays, public: summary.isPublic } : null,
            ownership, reasons,
        },
    };
}

export interface FaceitSnapshot {
    stub?: boolean;
    checkedAt: string;
    playerId?: string | null;
    elo?: number | null;
    skillLevel?: number | null;
    banned?: boolean | null;
    reasons: string[];
}

// Faceit akkauntini nick + o'yin bo'yicha tekshiradi (Elo + ban).
export async function verifyFaceit(nickname: string, gameSlug: string): Promise<{
    verdict: VerifyVerdict; snapshot: FaceitSnapshot; handle: string | null; externalId: string | null;
}> {
    const checkedAt = new Date().toISOString();
    if (!faceitAvailable()) {
        return {
            verdict: "TEKSHIRISH", handle: null, externalId: null,
            snapshot: { stub: true, checkedAt, reasons: ["FACEIT_API_KEY yo'q — stub rejim"] },
        };
    }

    const game = faceitGameForSlug(gameSlug);
    const player = await fetchFaceitByNickname(nickname, game);
    if (!player) {
        return {
            verdict: "TEKSHIRISH", handle: null, externalId: null,
            snapshot: { checkedAt, reasons: ["Faceit o'yinchisi topilmadi"] },
        };
    }

    const banned = await fetchFaceitBans(player.playerId);
    const reasons: string[] = [];
    let verdict: VerifyVerdict = "TOZA";

    if (banned === true) {
        verdict = "BLOK";
        reasons.push("Faceit ban mavjud (aktiv)");
    }
    if (player.elo != null) reasons.push(`Faceit Elo ${player.elo} (level ${player.skillLevel ?? "?"})`);
    if (verdict === "TOZA") reasons.push("Faceit ban yo'q");

    return {
        verdict, handle: player.nickname, externalId: player.playerId,
        snapshot: { checkedAt, playerId: player.playerId, elo: player.elo, skillLevel: player.skillLevel, banned, reasons },
    };
}

// --- MLBB (Moonton) — ochiq API YO'Q ---
// Egalik kod-isbot orqali tasdiqlanadi: o'yinchi quyidagi kodni vaqtincha IGN/nickiga
// qo'yib skrinshot yuboradi → admin tasdiqlaydi (2-3 bosqich). Jonli AC = Moonton'niki.

const PROOF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // chalkashmas: O/0/I/1 yo'q
export const PROOF_TTL_MS = 24 * 60 * 60 * 1000; // 24 soat

export function generateProofCode(): string {
    let s = "";
    for (let i = 0; i < 5; i++) s += PROOF_ALPHABET[Math.floor(Math.random() * PROOF_ALPHABET.length)];
    return `FH-${s}`;
}
export function proofExpiry(): Date {
    return new Date(Date.now() + PROOF_TTL_MS);
}
export function isProofExpired(expires: Date | null | undefined): boolean {
    return !expires || expires.getTime() < Date.now();
}
