import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";

// Elo -> karta darajasi (material). Boshlang'ich Elo 1000 = Bronza; o'ssa ko'tariladi.
function tierFromElo(elo: number): string {
    if (elo >= 1600) return "afsona";
    if (elo >= 1450) return "olmos";
    if (elo >= 1300) return "platina";
    if (elo >= 1150) return "oltin";
    if (elo >= 1050) return "kumush";
    return "bronza";
}
const TIER_LABEL: Record<string, string> = { bronza: "Bronza", kumush: "Kumush", oltin: "Oltin", platina: "Platina", olmos: "Olmos", afsona: "Afsona" };

function gameSlug(name?: string | null): string {
    const n = (name || "").toLowerCase();
    if (/cs|counter|strike/.test(n)) return "cs2";
    if (/dota/.test(n)) return "dota";
    if (/pubg/.test(n)) return "pubgm";
    if (/mlbb|mobile legends|bang/.test(n)) return "mlbb";
    return "other";
}
const GAME_LABEL: Record<string, string> = { cs2: "CS2", dota: "DOTA2", pubgm: "PUBGM", mlbb: "MLBB", other: "—" };
const GAME_CREST: Record<string, [string, string]> = {
    cs2: ["#ff9a4a", "#a8500f"], dota: ["#ef6a62", "#8a2420"], pubgm: ["#f4c430", "#a8780f"], mlbb: ["#4aa3ff", "#164f8a"], other: ["#8aa0c0", "#3a4a60"],
};
const COUNTRY_NAME: Record<string, string> = {
    UZ: "O'zbekiston", KZ: "Qozog'iston", TJ: "Tojikiston", KG: "Qirg'iziston", TM: "Turkmaniston",
    RU: "Rossiya", TR: "Turkiya", AF: "Afg'oniston", AZ: "Ozarbayjon", UA: "Ukraina", BY: "Belarus",
};
const RAV_COLORS = ["#3aa0ff", "#e0485c", "#c9922b", "#16a34a", "#7c5cff", "#2fae9b", "#d9682a"];

// GET /api/esport/teams/all — barcha jamoalar (meniki birinchi, qolgani Elo bo'yicha)
// Eski maydonlar saqlanadi (asl /esport teams-view ishlatadi) + `card` qo'shiladi (/esport-test).
export async function GET() {
    const me = await getMyProfile();

    const myTeamIds = new Set<string>();
    if (me) {
        const owned = await prisma.esTeam.findMany({ where: { ownerId: me.id }, select: { id: true } });
        owned.forEach(t => myTeamIds.add(t.id));
        const athlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
        if (athlete) {
            const m = await prisma.esRosterMember.findUnique({ where: { athleteId: athlete.id }, select: { roster: { select: { teamId: true } } } });
            if (m) myTeamIds.add(m.roster.teamId);
        }
    }

    const teams = await prisma.esTeam.findMany({
        select: {
            id: true, name: true, tag: true, logo: true, ownerId: true, createdAt: true,
            rosters: {
                select: {
                    rating: true, peakRating: true, game: { select: { name: true } },
                    _count: { select: { members: true } },
                    members: { select: { athlete: { select: { ign: true, image: true } } }, take: 7 },
                },
            },
        },
        take: 200,
    });

    // Ega davlatlari (bayroq uchun) — bitta so'rovda
    const ownerIds = [...new Set(teams.map(t => t.ownerId))];
    const owners = await prisma.userProfile.findMany({ where: { id: { in: ownerIds } }, select: { id: true, country: true } });
    const ownerCountry = new Map(owners.map(o => [o.id, o.country]));

    // Standings yig'indisi (g'alaba %, o'ynagan) — jamoa bo'yicha
    const stand = await prisma.esStanding.groupBy({ by: ["teamId"], _sum: { wins: true, losses: true, played: true } });
    const standMap = new Map(stand.map(s => [s.teamId, { wins: s._sum.wins ?? 0, played: s._sum.played ?? 0 }]));

    const cards = teams.map(t => {
        const rating = t.rosters.length ? Math.max(...t.rosters.map(r => r.rating)) : 1000;
        const members = t.rosters.reduce((s, r) => s + r._count.members, 0);
        const games = [...new Set(t.rosters.map(r => r.game?.name).filter(Boolean) as string[])];

        // Primary roster = eng kuchli (Elo)
        const primary = t.rosters.length ? t.rosters.reduce((a, b) => (b.rating > a.rating ? b : a)) : null;
        const slug = gameSlug(primary?.game?.name);
        const tier = tierFromElo(rating);
        const [c1, c2] = GAME_CREST[slug];
        const rawCC = (ownerCountry.get(t.ownerId) || "").toUpperCase();
        const cc = /^[A-Z]{2}$/.test(rawCC) && rawCC !== "IL" ? rawCC.toLowerCase() : undefined;
        const countryName = COUNTRY_NAME[rawCC] || (rawCC && rawCC !== "IL" ? rawCC : "");
        const st = standMap.get(t.id) || { wins: 0, played: 0 };
        const winPct = st.played > 0 ? Math.round((st.wins / st.played) * 100) : 0;
        const roster = (primary?.members || []).slice(0, 5).map((m, i) => ({
            in: (m.athlete.ign || "?").trim().slice(0, 1).toUpperCase(),
            color: RAV_COLORS[i % RAV_COLORS.length],
            img: m.athlete.image || undefined,
        }));

        const card = {
            tier, game: slug, gameLabel: GAME_LABEL[slug], rating, rank: TIER_LABEL[tier],
            name: t.name, crest: t.tag.slice(0, 1).toUpperCase(), crestImg: t.logo || undefined, crest1: c1, crest2: c2,
            country: countryName, cc, founded: new Date(t.createdAt).getFullYear(),
            champ: false,
            roster,
            stats: [
                { k: "PIK", v: primary?.peakRating ?? rating },
                { k: "G'AL", v: winPct },
                { k: "O'YN", v: st.played },
                { k: "A'ZO", v: members },
            ],
            lead: t.name, cap: `${TIER_LABEL[tier]} · ${GAME_LABEL[slug]} · ${members} o'yinchi`,
        };

        return { id: t.id, name: t.name, tag: t.tag, logo: t.logo, rating, members, games, isMine: myTeamIds.has(t.id), card };
    });

    cards.sort((a, b) => (b.isMine ? 1 : 0) - (a.isMine ? 1 : 0) || b.rating - a.rating);

    return NextResponse.json({ teams: cards, hasTeam: myTeamIds.size > 0 });
}
