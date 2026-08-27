import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { syncEsTournamentChannel } from "@/lib/esport-nexus-tournament";

// GET /api/esport/admin/tournaments?gameId= — turnirlar
export async function GET(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const gameId = new URL(req.url).searchParams.get("gameId") || undefined;
    const tournaments = await prisma.esTournament.findMany({
        where: gameId ? { gameId } : {}, orderBy: { createdAt: "desc" }, take: 50,
        include: { _count: { select: { participants: true } } },
    });
    return NextResponse.json({ tournaments: tournaments.map(t => ({ ...t, teams: t._count.participants })) });
}

// POST /api/esport/admin/tournaments — { gameId, divisionId?, seasonId?, name, prizePool?, maxTeams?, dates... }
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const b = await req.json();
    if (!b.gameId || !b.name?.trim()) return NextResponse.json({ error: "gameId va nom kerak" }, { status: 400 });
    const game = await prisma.esGame.findUnique({ where: { id: b.gameId }, select: { id: true, slug: true } });
    if (!game) return NextResponse.json({ error: "O'yin topilmadi" }, { status: 404 });

    const t = await prisma.esTournament.create({
        data: {
            gameId: b.gameId,
            divisionId: typeof b.divisionId === "string" && b.divisionId ? b.divisionId : null,
            seasonId: typeof b.seasonId === "string" && b.seasonId ? b.seasonId : null,
            name: String(b.name).trim().slice(0, 60),
            prizePool: b.prizePool != null ? Math.max(0, Number(b.prizePool)) : null,
            currency: b.currency === "USD" ? "USD" : "UZS",
            maxTeams: Number.isFinite(b.maxTeams) ? Math.max(0, Math.round(Number(b.maxTeams))) : 16,
            thirdPlace: b.thirdPlace !== false,
            registrationEndsAt: b.registrationEndsAt ? new Date(b.registrationEndsAt) : null,
            startsAt: b.startsAt ? new Date(b.startsAt) : null,
            endsAt: b.endsAt ? new Date(b.endsAt) : null,
        },
    });
    // Nexus turnir chat auto-create (jamoalar keyingi bosqichda qo'shiladi)
    after(() => syncEsTournamentChannel(t.id));
    return NextResponse.json({ ok: true, tournament: t });
}
