import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import { buildTeamCard } from "@/lib/esport-card";

// GET /api/esport/teams/all — barcha jamoalar (meniki birinchi, qolgani Elo bo'yicha)
// Eski maydonlar saqlanadi (asl /esport teams-view ishlatadi) + `card` qo'shiladi (/esport-test).
// Karta qurilishi: lib/esport-card buildTeamCard (yagona manba — teams/[id] ham shuni ishlatadi).
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
        const st = standMap.get(t.id) || { wins: 0, played: 0 };
        const winPct = st.played > 0 ? Math.round((st.wins / st.played) * 100) : 0;

        const card = buildTeamCard({
            name: t.name, tag: t.tag, logo: t.logo,
            rosters: t.rosters.map(r => ({
                rating: r.rating, peakRating: r.peakRating, gameName: r.game?.name,
                memberCount: r._count.members, members: r.members.map(m => ({ ign: m.athlete.ign, image: m.athlete.image })),
            })),
            ownerCountryRaw: ownerCountry.get(t.ownerId), createdAt: t.createdAt,
            winPct, played: st.played,
        });

        return { id: t.id, name: t.name, tag: t.tag, logo: t.logo, rating, members, games, isMine: myTeamIds.has(t.id), card };
    });

    cards.sort((a, b) => (b.isMine ? 1 : 0) - (a.isMine ? 1 : 0) || b.rating - a.rating);

    return NextResponse.json({ teams: cards, hasTeam: myTeamIds.size > 0 });
}
