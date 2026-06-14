import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// POST /api/esport/admin/move — jamoani boshqa divizionga ko'chirish (ko'tarilish/tushish)
// { seasonId, teamId, toDivisionId, reset? }
export async function POST(req: Request) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { seasonId, teamId, toDivisionId, reset } = await req.json();
    if (!seasonId || !teamId || !toDivisionId) return NextResponse.json({ error: "seasonId, teamId, toDivisionId kerak" }, { status: 400 });

    const standing = await prisma.esStanding.findFirst({ where: { seasonId, teamId }, select: { id: true, divisionId: true } });
    if (!standing) return NextResponse.json({ error: "Jamoa bu mavsumda emas" }, { status: 404 });
    const div = await prisma.esDivision.findUnique({ where: { id: toDivisionId }, select: { id: true, capacity: true } });
    if (!div) return NextResponse.json({ error: "Divizion topilmadi" }, { status: 404 });

    // Cheklangan divizion to'lgan bo'lsa — ko'chirib bo'lmaydi (Ochiq divizion capacity=null)
    if (div.capacity != null && standing.divisionId !== toDivisionId) {
        const count = await prisma.esStanding.count({ where: { seasonId, divisionId: toDivisionId } });
        if (count >= div.capacity) return NextResponse.json({ error: "Divizion to'lgan" }, { status: 400 });
    }

    await prisma.esStanding.update({
        where: { id: standing.id },
        data: { divisionId: toDivisionId, ...(reset === true ? { points: 0, wins: 0, losses: 0, played: 0 } : {}) },
    });
    return NextResponse.json({ ok: true });
}
