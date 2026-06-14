import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/esport/standings?gameId=&seasonId= — ommaviy jadval (divizionlar bo'yicha)
// seasonId berilmasa — o'yinning faol mavsumi.
export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    let gameId = sp.get("gameId") || "";
    let seasonId = sp.get("seasonId") || "";

    // O'yin: berilmasa birinchi faol o'yin (MLBB)
    if (!gameId && !seasonId) {
        const g = await prisma.esGame.findFirst({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true } });
        gameId = g?.id ?? "";
    }
    // Mavsum: berilmasa o'yinning faol mavsumi
    let season = seasonId
        ? await prisma.esSeason.findUnique({ where: { id: seasonId } })
        : await prisma.esSeason.findFirst({ where: { gameId, active: true }, orderBy: { startsAt: "desc" } });
    if (!season && gameId) season = await prisma.esSeason.findFirst({ where: { gameId }, orderBy: { startsAt: "desc" } });
    if (!season) return NextResponse.json({ season: null, divisions: [] });
    seasonId = season.id;
    gameId = season.gameId;

    const [divisions, standings] = await Promise.all([
        prisma.esDivision.findMany({ where: { gameId }, orderBy: { tier: "asc" } }),
        prisma.esStanding.findMany({ where: { seasonId } }),
    ]);
    const teamIds = [...new Set(standings.map(s => s.teamId))];
    const [teams, rosters] = await Promise.all([
        teamIds.length ? prisma.esTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, tag: true, logo: true } }) : [],
        teamIds.length ? prisma.esRoster.findMany({ where: { gameId, teamId: { in: teamIds } }, select: { teamId: true, rating: true } }) : [],
    ]);
    const tMap = Object.fromEntries(teams.map(t => [t.id, t]));
    const rMap = Object.fromEntries(rosters.map(r => [r.teamId, r.rating]));

    const byDiv = divisions.map(d => {
        const rows = standings
            .filter(s => s.divisionId === d.id)
            .sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses)
            .map((s, i) => ({
                rank: i + 1, teamId: s.teamId, team: tMap[s.teamId] ?? null,
                points: s.points, wins: s.wins, losses: s.losses, played: s.played,
                rating: rMap[s.teamId] ?? null,
            }));
        return { id: d.id, name: d.name, tier: d.tier, teams: rows };
    });

    return NextResponse.json({
        season: { id: season.id, name: season.name, active: season.active },
        gameId,
        divisions: byDiv,
    });
}
