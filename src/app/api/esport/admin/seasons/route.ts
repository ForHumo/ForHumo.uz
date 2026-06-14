import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// GET /api/esport/admin/seasons?gameId= — mavsumlar
export async function GET(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const gameId = new URL(req.url).searchParams.get("gameId") || undefined;
    const seasons = await prisma.esSeason.findMany({ where: gameId ? { gameId } : {}, orderBy: { startsAt: "desc" } });
    return NextResponse.json({ seasons });
}

// POST /api/esport/admin/seasons — { gameId, name }
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { gameId, name } = await req.json();
    if (!gameId || !name?.trim()) return NextResponse.json({ error: "gameId va nom kerak" }, { status: 400 });
    const game = await prisma.esGame.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) return NextResponse.json({ error: "O'yin topilmadi" }, { status: 404 });
    const season = await prisma.esSeason.create({ data: { gameId, name: String(name).trim().slice(0, 40) } });
    return NextResponse.json({ ok: true, season });
}

// PATCH /api/esport/admin/seasons — { id, active?, end? }
export async function PATCH(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id, active, end } = await req.json();
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
    const data: { active?: boolean; endsAt?: Date } = {};
    if (typeof active === "boolean") data.active = active;
    if (end === true) { data.active = false; data.endsAt = new Date(); }
    await prisma.esSeason.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
}
