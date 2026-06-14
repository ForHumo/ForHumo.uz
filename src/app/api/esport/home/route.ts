import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/esport/home — Asosiy dashboard (kuzatuvchilar uchun): faol turnirlar,
// eng yuqori Elo jamoalar, so'nggi natijalar. (Keyin: yangiliklar, eng qimmat o'yinchi, translyatsiya.)
export async function GET() {
    const [tournaments, topRosters, leagueResults, tourResults] = await Promise.all([
        prisma.esTournament.findMany({
            where: { status: { in: ["REGISTRATION", "LIVE", "UPCOMING"] } },
            orderBy: [{ status: "asc" }, { startsAt: "asc" }], take: 4,
            include: { game: { select: { name: true } }, _count: { select: { participants: true } } },
        }),
        prisma.esRoster.findMany({ orderBy: { rating: "desc" }, take: 6, select: { rating: true, teamId: true, game: { select: { name: true } } } }),
        prisma.esLeagueMatch.findMany({ where: { status: "DONE" }, orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.esMatch.findMany({ where: { status: "DONE", winnerId: { not: null } }, orderBy: { id: "desc" }, take: 5, select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true, winnerId: true } }),
    ]);

    // Jamoa nomlari
    const teamIds = [...new Set([
        ...topRosters.map(r => r.teamId),
        ...leagueResults.flatMap(m => [m.teamAId, m.teamBId]),
        ...tourResults.flatMap(m => [m.teamAId, m.teamBId].filter(Boolean) as string[]),
    ])];
    const teams = teamIds.length ? await prisma.esTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, tag: true, logo: true } }) : [];
    const tMap = Object.fromEntries(teams.map(t => [t.id, t]));

    const results = [
        ...leagueResults.map(m => ({ a: tMap[m.teamAId] ?? null, b: tMap[m.teamBId] ?? null, scoreA: m.scoreA, scoreB: m.scoreB, winnerId: m.winnerId })),
        ...tourResults.map(m => ({ a: m.teamAId ? tMap[m.teamAId] ?? null : null, b: m.teamBId ? tMap[m.teamBId] ?? null : null, scoreA: m.scoreA, scoreB: m.scoreB, winnerId: m.winnerId })),
    ].slice(0, 6);

    return NextResponse.json({
        tournaments: tournaments.map(t => ({ id: t.id, name: t.name, game: t.game?.name, status: t.status, teams: t._count.participants, prizePool: t.prizePool ? Number(t.prizePool) : null, currency: t.currency })),
        topTeams: topRosters.map(r => ({ team: tMap[r.teamId] ?? null, rating: r.rating, game: r.game?.name })).filter(x => x.team),
        results,
    });
}
