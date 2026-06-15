import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";

const ROLES = ["CAPTAIN", "STARTER", "SUB"];

// Sportchining shu jamoadagi a'zoligini topadi
async function memberInTeam(athleteId: string, teamId: string) {
    const m = await prisma.esRosterMember.findUnique({
        where: { athleteId },
        include: { roster: { select: { teamId: true } } },
    });
    return m && m.roster.teamId === teamId ? m : null;
}

// PATCH /api/esport/teams/[id]/members — rol o'rnatish (faqat ega) { athleteId, role }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const team = await prisma.esTeam.findUnique({ where: { id }, select: { ownerId: true } });
    if (!team || team.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const { athleteId, role } = await req.json();
    if (!ROLES.includes(role)) return NextResponse.json({ error: "Noto'g'ri rol" }, { status: 400 });
    const member = await memberInTeam(String(athleteId || ""), id);
    if (!member) return NextResponse.json({ error: "A'zo topilmadi" }, { status: 404 });

    await prisma.esRosterMember.update({ where: { id: member.id }, data: { role } });
    return NextResponse.json({ ok: true, athleteId, role });
}

// Eslatma: a'zoni chiqarish/chiqish endi FAQAT ikki tomonlama rozilik orqali
// (`/api/esport/teams/[id]/requests` + `/api/esport/requests/[id]`). Darhol chiqaruvchi
// DELETE endpoint OLIB TASHLANDI — kelishuv tizimini chetlab o'tmaslik uchun.
