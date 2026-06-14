import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";

// POST /api/esport/tournaments/[id]/register — jamoani ro'yxatdan o'tkazish { teamId }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const { teamId } = await req.json();
    if (!teamId) return NextResponse.json({ error: "teamId kerak" }, { status: 400 });

    const t = await prisma.esTournament.findUnique({
        where: { id },
        select: { id: true, gameId: true, divisionId: true, seasonId: true, status: true, maxTeams: true, registrationEndsAt: true },
    });
    if (!t) return NextResponse.json({ error: "Turnir topilmadi" }, { status: 404 });
    if (t.status !== "REGISTRATION") return NextResponse.json({ error: "Ro'yxat ochiq emas" }, { status: 400 });
    if (t.registrationEndsAt && t.registrationEndsAt.getTime() < Date.now()) return NextResponse.json({ error: "Ro'yxat muddati tugagan" }, { status: 400 });

    const team = await prisma.esTeam.findUnique({ where: { id: teamId }, select: { id: true, ownerId: true } });
    if (!team) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });
    if (team.ownerId !== me.id) return NextResponse.json({ error: "Faqat jamoa egasi ro'yxatdan o'tkazadi" }, { status: 403 });

    // O'yin tarkibi + teamSize tekshiruvi
    const game = await prisma.esGame.findUnique({ where: { id: t.gameId }, select: { teamSize: true } });
    const roster = await prisma.esRoster.findUnique({
        where: { teamId_gameId: { teamId, gameId: t.gameId } },
        select: { id: true, _count: { select: { members: true } } },
    });
    if (!roster) return NextResponse.json({ error: "Bu o'yin uchun tarkibingiz yo'q" }, { status: 400 });
    if (game && roster._count.members < game.teamSize) {
        return NextResponse.json({ error: `Tarkibда kamida ${game.teamSize} sportchi kerak (hozir ${roster._count.members})` }, { status: 400 });
    }

    // Divizion turniri bo'lsa — jamoa shu divizionда bo'lishi kerak
    if (t.divisionId && t.seasonId) {
        const inDiv = await prisma.esStanding.findFirst({ where: { seasonId: t.seasonId, divisionId: t.divisionId, teamId }, select: { id: true } });
        if (!inDiv) return NextResponse.json({ error: "Jamoa bu divizionда emas" }, { status: 400 });
    }

    // To'lganmi?
    if (t.maxTeams > 0) {
        const count = await prisma.esTournamentTeam.count({ where: { tournamentId: id } });
        if (count >= t.maxTeams) return NextResponse.json({ error: "Turnir to'lgan" }, { status: 400 });
    }

    try {
        await prisma.esTournamentTeam.create({ data: { tournamentId: id, teamId, rosterId: roster.id } });
    } catch {
        return NextResponse.json({ error: "Jamoa allaqachon ro'yxatda" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
}
