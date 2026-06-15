import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ROLE_LABEL: Record<string, string> = { CAPTAIN: "Kapitan", STARTER: "Asosiy", SUB: "Zaxira" };

// GET /api/esport/home — Asosiy dashboard (kuzatuvchilar uchun):
// translyatsiya oynasi (jonli/rejada/o'tgan), faol turnirlar, Top 5 jamoa, Top 5 o'yinchi, so'nggi natijalar.
export async function GET() {
    const [tournaments, topRosters, topMembers, leagueResults, tourResults, live, scheduled, ended] = await Promise.all([
        prisma.esTournament.findMany({
            where: { status: { in: ["REGISTRATION", "LIVE", "UPCOMING"] } },
            orderBy: [{ status: "asc" }, { startsAt: "asc" }], take: 4,
            include: { game: { select: { name: true } }, _count: { select: { participants: true } } },
        }),
        prisma.esRoster.findMany({ orderBy: { rating: "desc" }, take: 5, select: { rating: true, teamId: true, game: { select: { name: true } } } }),
        // Top 5 o'yinchi — eng yuqori reytingli tarkiblardagi sportchilar
        prisma.esRosterMember.findMany({
            orderBy: { roster: { rating: "desc" } }, take: 5,
            select: {
                role: true,
                athlete: { select: { id: true, ign: true, role: true } },
                roster: { select: { rating: true, team: { select: { id: true, name: true, tag: true, logo: true } }, game: { select: { name: true } } } },
            },
        }),
        prisma.esLeagueMatch.findMany({ where: { status: "DONE" }, orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.esMatch.findMany({ where: { status: "DONE", winnerId: { not: null } }, orderBy: { id: "desc" }, take: 5, select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true, winnerId: true } }),
        prisma.esBroadcast.findMany({ where: { status: "LIVE" }, orderBy: { createdAt: "desc" }, take: 3 }),
        prisma.esBroadcast.findMany({ where: { status: "SCHEDULED" }, orderBy: { scheduledAt: "asc" }, take: 5 }),
        prisma.esBroadcast.findMany({ where: { status: "ENDED" }, orderBy: { endedAt: "desc" }, take: 6 }),
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

    const mapCast = (b: typeof live[number]) => ({
        id: b.id, title: b.title, status: b.status, streamUrl: b.streamUrl, nexusLiveId: b.nexusLiveId,
        posterUrl: b.posterUrl, scheduledAt: b.scheduledAt, viewers: b.viewers,
    });

    return NextResponse.json({
        broadcasts: { live: live.map(mapCast), scheduled: scheduled.map(mapCast), ended: ended.map(mapCast) },
        tournaments: tournaments.map(t => ({ id: t.id, name: t.name, game: t.game?.name, status: t.status, teams: t._count.participants, prizePool: t.prizePool ? Number(t.prizePool) : null, currency: t.currency })),
        topTeams: topRosters.map(r => ({ team: tMap[r.teamId] ?? null, rating: r.rating, game: r.game?.name })).filter(x => x.team),
        topPlayers: topMembers.map(m => ({
            id: m.athlete.id, ign: m.athlete.ign, position: m.athlete.role,
            roleLabel: ROLE_LABEL[m.role] || m.role,
            team: m.roster.team, rating: m.roster.rating, game: m.roster.game?.name,
        })),
        results,
    });
}
