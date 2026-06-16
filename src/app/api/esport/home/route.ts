import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playbackIframeUrl } from "@/lib/esport-stream";

const ROLE_LABEL: Record<string, string> = { CAPTAIN: "Kapitan", STARTER: "Asosiy", SUB: "Zaxira" };

// GET /api/esport/home — Asosiy dashboard:
// efir, yangiliklar, faol turnirlar, Top 5 jamoa/o'yinchi, eng qimmat o'yinchi/jamoa, bo'lajak o'yinlar, so'nggi natijalar.
export async function GET() {
    const now = Date.now();
    const nowDate = new Date();
    const [tournaments, topRosters, topMembers, leagueResults, tourResults, rawCasts, adminNews, expPlayers, allMembers, upTour, upLeague, recentTransfers] = await Promise.all([
        prisma.esTournament.findMany({
            where: { status: { in: ["REGISTRATION", "LIVE", "UPCOMING"] } },
            orderBy: [{ status: "asc" }, { startsAt: "asc" }], take: 4,
            include: { game: { select: { name: true } }, _count: { select: { participants: true } } },
        }),
        prisma.esRoster.findMany({ orderBy: { rating: "desc" }, take: 5, select: { rating: true, teamId: true, game: { select: { name: true } } } }),
        prisma.esRosterMember.findMany({
            orderBy: { roster: { rating: "desc" } }, take: 5,
            select: { role: true, athlete: { select: { id: true, ign: true, role: true, image: true, humoProfileId: true } }, roster: { select: { rating: true, team: { select: { id: true, name: true, tag: true, logo: true } }, game: { select: { name: true } } } } },
        }),
        prisma.esLeagueMatch.findMany({ where: { status: "DONE" }, orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.esMatch.findMany({ where: { status: "DONE", winnerId: { not: null } }, orderBy: { id: "desc" }, take: 5, select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true, winnerId: true } }),
        prisma.esBroadcast.findMany({ orderBy: { scheduledAt: "desc" }, take: 40 }),
        prisma.esNews.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 8 }),
        prisma.esAthlete.findMany({
            where: { marketValue: { gt: 0 } }, orderBy: { marketValue: "desc" }, take: 5,
            select: { id: true, ign: true, role: true, image: true, humoProfileId: true, marketValue: true, memberships: { select: { roster: { select: { team: { select: { name: true, tag: true } } } } }, take: 1 } },
        }),
        prisma.esRosterMember.findMany({ select: { athlete: { select: { marketValue: true } }, roster: { select: { teamId: true, team: { select: { id: true, name: true, tag: true, logo: true } } } } } }),
        prisma.esMatch.findMany({ where: { status: { in: ["PENDING", "LIVE"] }, scheduledAt: { gt: nowDate }, teamAId: { not: null }, teamBId: { not: null } }, orderBy: { scheduledAt: "asc" }, take: 5, select: { teamAId: true, teamBId: true, scheduledAt: true } }),
        prisma.esLeagueMatch.findMany({ where: { status: "SCHEDULED", scheduledAt: { gt: nowDate } }, orderBy: { scheduledAt: "asc" }, take: 5, select: { teamAId: true, teamBId: true, scheduledAt: true } }),
        prisma.esTransfer.findMany({ where: { status: "DONE" }, orderBy: { createdAt: "desc" }, take: 4, select: { athleteId: true, toTeamId: true, createdAt: true } }),
    ]);

    // ── Eng qimmat jamoalar (a'zolar marketValue yig'indisi) ──
    const teamValue: Record<string, { value: number; team: { id: string; name: string; tag: string; logo: string | null } }> = {};
    for (const m of allMembers) {
        const v = m.athlete.marketValue ? Number(m.athlete.marketValue) : 0;
        if (!m.roster.team) continue;
        const id = m.roster.teamId;
        if (!teamValue[id]) teamValue[id] = { value: 0, team: m.roster.team };
        teamValue[id].value += v;
    }
    const expensiveTeams = Object.values(teamValue).filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 5)
        .map(x => ({ team: x.team, value: x.value }));

    // ── Jamoa nomlari (natijalar + bo'lajak o'yinlar uchun) ──
    const teamIds = [...new Set([
        ...topRosters.map(r => r.teamId),
        ...leagueResults.flatMap(m => [m.teamAId, m.teamBId]),
        ...tourResults.flatMap(m => [m.teamAId, m.teamBId].filter(Boolean) as string[]),
        ...upTour.flatMap(m => [m.teamAId, m.teamBId].filter(Boolean) as string[]),
        ...upLeague.flatMap(m => [m.teamAId, m.teamBId]),
        ...recentTransfers.map(t => t.toTeamId),
    ])];
    const teams = teamIds.length ? await prisma.esTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, tag: true, logo: true } }) : [];
    const tMap = Object.fromEntries(teams.map(t => [t.id, t]));

    // Top o'yinchilar avatari (athlete rasmi yoki Humo ID rasmi)
    const memberHumoIds = [...new Set(topMembers.map(m => m.athlete.humoProfileId))];
    const memberProfs = memberHumoIds.length ? await prisma.userProfile.findMany({ where: { id: { in: memberHumoIds } }, select: { id: true, image: true } }) : [];
    const mpMap = Object.fromEntries(memberProfs.map(p => [p.id, p.image]));

    const results = [
        ...leagueResults.map(m => ({ a: tMap[m.teamAId] ?? null, b: tMap[m.teamBId] ?? null, scoreA: m.scoreA, scoreB: m.scoreB, winnerId: m.winnerId })),
        ...tourResults.map(m => ({ a: m.teamAId ? tMap[m.teamAId] ?? null : null, b: m.teamBId ? tMap[m.teamBId] ?? null : null, scoreA: m.scoreA, scoreB: m.scoreB, winnerId: m.winnerId })),
    ].slice(0, 6);

    const upcoming = [
        ...upTour.map(m => ({ a: m.teamAId ? tMap[m.teamAId] ?? null : null, b: m.teamBId ? tMap[m.teamBId] ?? null : null, at: m.scheduledAt })),
        ...upLeague.map(m => ({ a: tMap[m.teamAId] ?? null, b: tMap[m.teamBId] ?? null, at: m.scheduledAt })),
    ].filter(x => x.a && x.b).sort((a, b) => new Date(a.at!).getTime() - new Date(b.at!).getTime()).slice(0, 6);

    // ── Yangiliklar: admin + avto (natijalar/transferlar) ──
    const athProfs = recentTransfers.length ? await prisma.esAthlete.findMany({ where: { id: { in: recentTransfers.map(t => t.athleteId) } }, select: { id: true, ign: true } }) : [];
    const aIgn = Object.fromEntries(athProfs.map(a => [a.id, a.ign]));
    const autoNews = [
        ...recentTransfers.map(t => ({ id: `tr-${t.athleteId}-${t.toTeamId}`, kind: "auto" as const, title: `${aIgn[t.athleteId] ?? "Sportchi"} → ${tMap[t.toTeamId]?.name ?? "yangi jamoa"}`, body: "Transfer yakunlandi", image: null as string | null, createdAt: t.createdAt })),
    ];
    const news = [
        ...adminNews.map(n => ({ id: n.id, kind: "admin" as const, title: n.title, body: n.body, image: n.image, pinned: n.pinned, createdAt: n.createdAt })),
        ...autoNews,
    ].sort((a, b) => (("pinned" in b && b.pinned) ? 1 : 0) - (("pinned" in a && a.pinned) ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

    // ── Efir avto-status ──
    const WEEK = 7 * 864e5;
    const castStatus = (b: typeof rawCasts[number]): string => {
        const s = b.scheduledAt ? new Date(b.scheduledAt).getTime() : null;
        const e = b.endsAt ? new Date(b.endsAt).getTime() : null;
        if (s && now < s) return "SCHEDULED";
        if (e && now >= e) return "ENDED";
        if (s && now >= s) return "LIVE";
        return b.status;
    };
    const crank = (st: string) => (st === "LIVE" ? 0 : st === "SCHEDULED" ? 1 : 2);
    const broadcasts = rawCasts
        .map(b => ({ id: b.id, title: b.title, status: castStatus(b), streamUrl: b.streamUrl, nexusLiveId: b.nexusLiveId, posterUrl: b.posterUrl, scheduledAt: b.scheduledAt, endsAt: b.endsAt, viewers: b.viewers, source: b.source, playbackUrl: b.source === "CLOUDFLARE" ? playbackIframeUrl(b.playbackId) : null }))
        .filter(b => b.status !== "ENDED" || !b.endsAt || now - new Date(b.endsAt).getTime() < WEEK)
        .sort((a, b) => { const r = crank(a.status) - crank(b.status); if (r !== 0) return r; const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0; const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0; return a.status === "SCHEDULED" ? at - bt : bt - at; })
        .slice(0, 12);

    return NextResponse.json({
        broadcasts,
        news,
        tournaments: tournaments.map(t => ({ id: t.id, name: t.name, game: t.game?.name, status: t.status, teams: t._count.participants, prizePool: t.prizePool ? Number(t.prizePool) : null, currency: t.currency })),
        topTeams: topRosters.map(r => ({ team: tMap[r.teamId] ?? null, rating: r.rating, game: r.game?.name })).filter(x => x.team),
        topPlayers: topMembers.map(m => ({ id: m.athlete.id, ign: m.athlete.ign, position: m.athlete.role, roleLabel: ROLE_LABEL[m.role] || m.role, image: m.athlete.image ?? mpMap[m.athlete.humoProfileId] ?? null, team: m.roster.team, rating: m.roster.rating, game: m.roster.game?.name })),
        expensivePlayers: expPlayers.map(a => ({ id: a.id, ign: a.ign, position: a.role, image: a.image, value: a.marketValue ? Number(a.marketValue) : 0, team: a.memberships[0]?.roster.team ?? null })),
        expensiveTeams,
        upcoming,
        results,
    });
}
