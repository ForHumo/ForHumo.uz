import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// GET /api/esport/admin/divisions?gameId= — divizionlar (tier bo'yicha)
export async function GET(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const gameId = new URL(req.url).searchParams.get("gameId") || undefined;
    const divisions = await prisma.esDivision.findMany({
        where: gameId ? { gameId } : {}, orderBy: [{ gameId: "asc" }, { tier: "asc" }],
    });
    return NextResponse.json({ divisions });
}

// POST /api/esport/admin/divisions — { gameId, name, tier }
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { gameId, name, tier } = await req.json();
    const t = Math.max(1, Math.min(20, Math.round(Number(tier) || 0)));
    if (!gameId || !name?.trim() || !t) return NextResponse.json({ error: "gameId, nom, tier kerak" }, { status: 400 });
    const game = await prisma.esGame.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) return NextResponse.json({ error: "O'yin topilmadi" }, { status: 404 });
    try {
        const division = await prisma.esDivision.create({ data: { gameId, name: String(name).trim().slice(0, 40), tier: t } });
        return NextResponse.json({ ok: true, division });
    } catch {
        return NextResponse.json({ error: "Bu tier allaqachon mavjud" }, { status: 409 });
    }
}

// DELETE /api/esport/admin/divisions — { id }
export async function DELETE(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    // Standings bo'lsa o'chirmaymiz (ma'lumot yo'qolmasin)
    const used = await prisma.esStanding.count({ where: { divisionId: id } });
    if (used) return NextResponse.json({ error: "Divizionda jamoalar bor — avval ko'chiring" }, { status: 400 });
    await prisma.esDivision.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
}
