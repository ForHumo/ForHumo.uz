import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/esport/tournaments?gameId=&status= — ommaviy turnirlar ro'yxati
export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const gameId = sp.get("gameId") || undefined;
    const status = sp.get("status") || undefined;

    const tournaments = await prisma.esTournament.findMany({
        where: { ...(gameId ? { gameId } : {}), ...(status ? { status } : {}) },
        orderBy: [{ status: "asc" }, { startsAt: "desc" }, { createdAt: "desc" }], take: 50,
        include: { game: { select: { name: true, slug: true } }, _count: { select: { participants: true } } },
    });
    return NextResponse.json({
        tournaments: tournaments.map(t => ({
            id: t.id, name: t.name, game: t.game, status: t.status,
            prizePool: t.prizePool ? Number(t.prizePool) : null, currency: t.currency,
            maxTeams: t.maxTeams, teams: t._count.participants,
            registrationEndsAt: t.registrationEndsAt, startsAt: t.startsAt, endsAt: t.endsAt,
        })),
    });
}
