import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import { executeTransfer, TRANSFER_MSG } from "@/lib/esport-transfer";

// POST /api/esport/transfers/[id] — { action: approve|reject|cancel }
// approve/reject — sportchi; cancel — xaridor (toTeam egasi).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const tr = await prisma.esTransfer.findUnique({ where: { id }, select: { id: true, status: true, athleteId: true, toTeamId: true } });
    if (!tr || tr.status !== "PENDING") return NextResponse.json({ error: "Taklif topilmadi yoki yopilgan" }, { status: 404 });

    const athlete = await prisma.esAthlete.findUnique({ where: { id: tr.athleteId }, select: { humoProfileId: true } });
    const toTeam = await prisma.esTeam.findUnique({ where: { id: tr.toTeamId }, select: { ownerId: true } });
    const isAthlete = athlete?.humoProfileId === me.id;
    const isBuyer = toTeam?.ownerId === me.id;

    const { action } = await req.json();

    if (action === "approve") {
        if (!isAthlete) return NextResponse.json({ error: "Faqat sportchi tasdiqlaydi" }, { status: 403 });
        const r = await executeTransfer(id);
        if (r !== "ok") return NextResponse.json({ error: TRANSFER_MSG[r] }, { status: 400 });
        return NextResponse.json({ ok: true });
    }
    if (action === "reject") {
        if (!isAthlete) return NextResponse.json({ error: "Faqat sportchi rad etadi" }, { status: 403 });
        await prisma.esTransfer.update({ where: { id }, data: { status: "REJECTED" } });
        return NextResponse.json({ ok: true });
    }
    if (action === "cancel") {
        if (!isBuyer) return NextResponse.json({ error: "Faqat xaridor bekor qiladi" }, { status: 403 });
        await prisma.esTransfer.update({ where: { id }, data: { status: "CANCELLED" } });
        return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
}
