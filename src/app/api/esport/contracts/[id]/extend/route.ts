import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import { addMonths } from "@/lib/esport-contract";

// POST /api/esport/contracts/[id]/extend — shartnomani uzaytirish (faqat jamoa egasi) { months }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const { id } = await params;

    const c = await prisma.esContract.findUnique({ where: { id }, select: { id: true, teamId: true, endsAt: true } });
    if (!c) return NextResponse.json({ error: "Shartnoma topilmadi" }, { status: 404 });
    const team = await prisma.esTeam.findUnique({ where: { id: c.teamId }, select: { ownerId: true } });
    if (!team || team.ownerId !== me.id) return NextResponse.json({ error: "Faqat jamoa egasi" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    const months = Math.max(1, Math.min(60, Math.round(Number(b.months) || 0)));
    if (!months) return NextResponse.json({ error: "Oy soni kerak" }, { status: 400 });

    // Hali tugamagan bo'lsa joriy muddatdan, aks holda bugundan boshlab uzaytiramiz
    const base = c.endsAt && c.endsAt.getTime() > Date.now() ? c.endsAt : new Date();
    const endsAt = addMonths(base, months);
    await prisma.esContract.update({ where: { id }, data: { endsAt, status: "ACTIVE" } });
    return NextResponse.json({ ok: true, endsAt });
}
