import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile, userHasTeam } from "@/lib/esport";
import { addAthleteToTeam, ADD_MSG } from "@/lib/esport-roster";

// POST /api/esport/teams/join — taklif-kod bilan jamoaga qo'shilish { code }
export async function POST(req: Request) {
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const athlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    if (!athlete) return NextResponse.json({ error: "Avval sportchi profilini yarating", needAthlete: true }, { status: 400 });

    // Bitta odam = bitta jamoa — allaqachon jamodada bo'lsa qo'shila olmaydi
    if (await userHasTeam(me.id)) return NextResponse.json({ error: "Siz allaqachon bir jamodasiz — boshqa jamoaga qo'shila olmaysiz" }, { status: 409 });

    const { code } = await req.json();
    const clean = String(code || "").trim().toUpperCase();
    if (!clean) return NextResponse.json({ error: "Kod kiriting" }, { status: 400 });

    const invite = await prisma.esTeamInvite.findUnique({ where: { code: clean } });
    if (!invite) return NextResponse.json({ error: "Kod topilmadi" }, { status: 404 });
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Kod muddati o'tgan" }, { status: 400 });
    if (invite.usedCount >= invite.maxUses) return NextResponse.json({ error: "Kod ishlatib bo'lingan" }, { status: 400 });

    const result = await addAthleteToTeam(athlete.id, invite.teamId);
    if (result !== "ok") return NextResponse.json({ error: ADD_MSG[result] }, { status: 400 });

    await prisma.esTeamInvite.update({ where: { id: invite.id }, data: { usedCount: { increment: 1 } } });
    return NextResponse.json({ ok: true, teamId: invite.teamId });
}
