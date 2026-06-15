import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";

// GET /api/esport/teams/all — barcha jamoalar kartalari (meniki birinchi, qolgani Elo bo'yicha)
export async function GET() {
    const me = await getMyProfile();

    // Meniki: ega bo'lgan + a'zo bo'lgan jamoa
    let myTeamIds = new Set<string>();
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
            id: true, name: true, tag: true, logo: true,
            rosters: { select: { rating: true, game: { select: { name: true } }, _count: { select: { members: true } } } },
        },
        take: 200,
    });

    const cards = teams.map(t => {
        const rating = t.rosters.length ? Math.max(...t.rosters.map(r => r.rating)) : 1000;
        const members = t.rosters.reduce((s, r) => s + r._count.members, 0);
        const games = [...new Set(t.rosters.map(r => r.game?.name).filter(Boolean) as string[])];
        return { id: t.id, name: t.name, tag: t.tag, logo: t.logo, rating, members, games, isMine: myTeamIds.has(t.id) };
    });

    // Meniki birinchi, qolgani Elo desc
    cards.sort((a, b) => (b.isMine ? 1 : 0) - (a.isMine ? 1 : 0) || b.rating - a.rating);

    return NextResponse.json({ teams: cards, hasTeam: myTeamIds.size > 0 });
}
