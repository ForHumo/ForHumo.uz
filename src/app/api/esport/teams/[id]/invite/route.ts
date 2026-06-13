import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import { genInviteCode } from "@/lib/esport-roster";

// POST /api/esport/teams/[id]/invite — taklif-kod yaratish (faqat ega) { maxUses?, expiresHours? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const team = await prisma.esTeam.findUnique({ where: { id }, select: { ownerId: true } });
    if (!team || team.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const maxUses = Math.min(Math.max(Number(body.maxUses) || 1, 1), 50);
    const expiresHours = Number(body.expiresHours);
    const expiresAt = Number.isFinite(expiresHours) && expiresHours > 0
        ? new Date(Date.now() + Math.min(expiresHours, 720) * 3600_000)
        : null;

    // Noyob kod (to'qnashuvda qayta urinish)
    let code = genInviteCode();
    for (let i = 0; i < 5; i++) {
        const exists = await prisma.esTeamInvite.findUnique({ where: { code }, select: { id: true } });
        if (!exists) break;
        code = genInviteCode();
    }

    await prisma.esTeamInvite.create({ data: { teamId: id, code, createdBy: me.id, maxUses, expiresAt } });
    return NextResponse.json({ ok: true, code, maxUses, expiresAt });
}
