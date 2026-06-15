import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ROLE_LABEL: Record<string, string> = { CAPTAIN: "Kapitan", STARTER: "Asosiy", SUB: "Zaxira" };

// GET /api/esport/home — Asosiy dashboard (kuzatuvchilar uchun):
// translyatsiya oynasi (jonli/rejada/o'tgan), faol turnirlar, Top 5 jamoa, Top 5 o'yinchi, so'nggi natijalar.
export async function GET() {
    const [tournaments, topRosters, topMembers, leagueResults, tourResults, rawCasts] = await Promise.all([
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
        prisma.esBroadcast.findMany({ orderBy: { scheduledAt: "desc" }, take: 40 }),
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

    // Avto-status: boshlanmagan=Rejada, boshlandi & tugamagan=Jonli, tugagan=Tugadi
    const now = Date.now();
    const WEEK = 7 * 864e5;
    const castStatus = (b: typeof rawCasts[number]): string => {
        const s = b.scheduledAt ? new Date(b.scheduledAt).getTime() : null;
        const e = b.endsAt ? new Date(b.endsAt).getTime() : null;
        if (s && now < s) return "SCHEDULED";
        if (e && now >= e) return "ENDED";
        if (s && now >= s) return "LIVE";
        return b.status; // vaqt yo'q — qo'lda holat
    };
    const rank = (st: string) => (st === "LIVE" ? 0 : st === "SCHEDULED" ? 1 : 2);
    const broadcasts = rawCasts
        .map(b => ({
            id: b.id, title: b.title, status: castStatus(b), streamUrl: b.streamUrl, nexusLiveId: b.nexusLiveId,
            posterUrl: b.posterUrl, scheduledAt: b.scheduledAt, endsAt: b.endsAt, viewers: b.viewers,
        }))
        // juda eski tugaganlarni yashir (oxirgi hafta)
        .filter(b => b.status !== "ENDED" || !b.endsAt || now - new Date(b.endsAt).getTime() < WEEK)
        .sort((a, b) => {
            const r = rank(a.status) - rank(b.status);
            if (r !== 0) return r;
            const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
            const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
            return a.status === "SCHEDULED" ? at - bt : bt - at; // rejada: yaqin avval; aks holda yangi avval
        })
        .slice(0, 12);

    return NextResponse.json({
        broadcasts,
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
