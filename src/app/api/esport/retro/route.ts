import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/esport/retro — arxiv turnirlar (tarixiy natijalar + match history)
export async function GET() {
    const retros = await prisma.esRetro.findMany({
        orderBy: { endDate: "desc" },
        include: { matches: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({
        retros: retros.map(r => ({
            id: r.id, name: r.name, season: r.season, game: r.game, organizer: r.organizer,
            startDate: r.startDate, endDate: r.endDate, prizePool: r.prizePool, currency: r.currency,
            champion: r.champion, runnerUp: r.runnerUp, third: r.third,
            matches: r.matches.map(m => ({
                order: m.order, date: m.date, time: m.time, stage: m.stage,
                teamA: m.teamA, teamB: m.teamB, scoreA: m.scoreA, scoreB: m.scoreB,
                winner: m.winner, note: m.note, reason: m.reason, youtube: m.youtube,
            })),
        })),
    });
}
