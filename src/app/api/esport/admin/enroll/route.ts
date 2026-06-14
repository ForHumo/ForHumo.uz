import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// POST /api/esport/admin/enroll — jamoani mavsumga kiritish { teamId, seasonId }
// Yangi jamoa ENG QUYI divizionga (eng katta tier) tushadi (B model: pastdan ko'tariladi).
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { teamId, seasonId } = await req.json();
    if (!teamId || !seasonId) return NextResponse.json({ error: "teamId va seasonId kerak" }, { status: 400 });

    const season = await prisma.esSeason.findUnique({ where: { id: seasonId }, select: { id: true, gameId: true } });
    if (!season) return NextResponse.json({ error: "Mavsum topilmadi" }, { status: 404 });
    const team = await prisma.esTeam.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });

    // Eng quyi divizion (eng katta tier)
    const lowest = await prisma.esDivision.findFirst({ where: { gameId: season.gameId }, orderBy: { tier: "desc" }, select: { id: true } });
    if (!lowest) return NextResponse.json({ error: "Avval divizion yarating" }, { status: 400 });

    // Allaqachon shu mavsumda?
    const existing = await prisma.esStanding.findFirst({ where: { seasonId, teamId }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Jamoa allaqachon shu mavsumda" }, { status: 409 });

    await prisma.esStanding.create({ data: { seasonId, divisionId: lowest.id, teamId } });
    return NextResponse.json({ ok: true, divisionId: lowest.id });
}
