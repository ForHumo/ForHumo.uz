import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { applyElo } from "@/lib/esport-elo";

const WIN_POINTS = 3;

// GET /api/esport/admin/league-matches?seasonId=&divisionId= — o'yinlar
export async function GET(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const sp = new URL(req.url).searchParams;
    const seasonId = sp.get("seasonId") || undefined;
    const divisionId = sp.get("divisionId") || undefined;
    if (!seasonId) return NextResponse.json({ matches: [] });
    const matches = await prisma.esLeagueMatch.findMany({
        where: { seasonId, ...(divisionId ? { divisionId } : {}) }, orderBy: { createdAt: "desc" }, take: 100,
    });
    return NextResponse.json({ matches });
}

// POST /api/esport/admin/league-matches — { seasonId, divisionId, teamAId, teamBId, scheduledAt?, streamUrl? }
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { seasonId, divisionId, teamAId, teamBId, scheduledAt, streamUrl } = await req.json();
    if (!seasonId || !divisionId || !teamAId || !teamBId) return NextResponse.json({ error: "seasonId, divisionId, ikki jamoa kerak" }, { status: 400 });
    if (teamAId === teamBId) return NextResponse.json({ error: "Bir jamoa ikki marta bo'la olmaydi" }, { status: 400 });

    // Ikki jamoa ham shu divizion+mavsumda bo'lishi kerak
    const inDiv = await prisma.esStanding.count({ where: { seasonId, divisionId, teamId: { in: [teamAId, teamBId] } } });
    if (inDiv < 2) return NextResponse.json({ error: "Ikkala jamoa ham shu divizionda bo'lishi kerak" }, { status: 400 });

    const match = await prisma.esLeagueMatch.create({
        data: {
            seasonId, divisionId, teamAId, teamBId,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            streamUrl: typeof streamUrl === "string" && streamUrl ? streamUrl.slice(0, 300) : null,
        },
    });
    return NextResponse.json({ ok: true, match });
}

// PATCH /api/esport/admin/league-matches — natija kiritish { id, scoreA, scoreB } → standings yangilanadi
export async function PATCH(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id, scoreA, scoreB } = await req.json();
    const a = Math.max(0, Math.round(Number(scoreA)));
    const b = Math.max(0, Math.round(Number(scoreB)));
    if (!id || !Number.isFinite(a) || !Number.isFinite(b)) return NextResponse.json({ error: "id va hisob kerak" }, { status: 400 });
    if (a === b) return NextResponse.json({ error: "Durang bo'lmaydi — g'olib aniq bo'lsin" }, { status: 400 });

    const match = await prisma.esLeagueMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: "O'yin topilmadi" }, { status: 404 });
    if (match.status === "DONE") return NextResponse.json({ error: "Natija allaqachon kiritilgan" }, { status: 400 });

    const winnerId = a > b ? match.teamAId : match.teamBId;
    const loserId = a > b ? match.teamBId : match.teamAId;

    // Standing'ni mavsum+jamoa bo'yicha topamiz (divizion key emas) — jamoa o'yin
    // yaratilgandan keyin boshqa divizionga ko'chsa ham natija to'g'ri yoziladi (500 bo'lmaydi).
    const [stW, stL, season] = await Promise.all([
        prisma.esStanding.findFirst({ where: { seasonId: match.seasonId, teamId: winnerId }, select: { id: true } }),
        prisma.esStanding.findFirst({ where: { seasonId: match.seasonId, teamId: loserId }, select: { id: true } }),
        prisma.esSeason.findUnique({ where: { id: match.seasonId }, select: { gameId: true } }),
    ]);

    // Elo: shu o'yin valyutasidagi (mavsum o'yini) jamoa rosterlari
    const [rosterW, rosterL] = season ? await Promise.all([
        prisma.esRoster.findUnique({ where: { teamId_gameId: { teamId: winnerId, gameId: season.gameId } }, select: { id: true, rating: true, peakRating: true, lowRating: true } }),
        prisma.esRoster.findUnique({ where: { teamId_gameId: { teamId: loserId, gameId: season.gameId } }, select: { id: true, rating: true, peakRating: true, lowRating: true } }),
    ]) : [null, null];

    const ops: Prisma.PrismaPromise<unknown>[] = [
        prisma.esLeagueMatch.update({ where: { id }, data: { scoreA: a, scoreB: b, winnerId, status: "DONE" } }),
    ];
    if (stW) ops.push(prisma.esStanding.update({ where: { id: stW.id }, data: { points: { increment: WIN_POINTS }, wins: { increment: 1 }, played: { increment: 1 } } }));
    if (stL) ops.push(prisma.esStanding.update({ where: { id: stL.id }, data: { losses: { increment: 1 }, played: { increment: 1 } } }));
    if (rosterW && rosterL) {
        const { newA, newB } = applyElo(rosterW.rating, rosterL.rating, true);
        ops.push(prisma.esRoster.update({ where: { id: rosterW.id }, data: { rating: newA, peakRating: Math.max(rosterW.peakRating, newA), lowRating: Math.min(rosterW.lowRating, newA) } }));
        ops.push(prisma.esRoster.update({ where: { id: rosterL.id }, data: { rating: newB, peakRating: Math.max(rosterL.peakRating, newB), lowRating: Math.min(rosterL.lowRating, newB) } }));
    }
    await prisma.$transaction(ops);
    return NextResponse.json({ ok: true, winnerId });
}
