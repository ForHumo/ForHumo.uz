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

// DELETE /api/esport/teams/[id]/members — chiqarish (ega) yoki chiqish (sportchi o'zi) { athleteId }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const { athleteId } = await req.json().catch(() => ({}));
    const targetAthleteId = String(athleteId || "");
    if (!targetAthleteId) return NextResponse.json({ error: "athleteId kerak" }, { status: 400 });

    const team = await prisma.esTeam.findUnique({ where: { id }, select: { ownerId: true } });
    if (!team) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });

    // Ruxsat: ega istalgan a'zoni chiqaradi; sportchi faqat o'zini chiqaradi
    const myAthlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    const isOwner = team.ownerId === me.id;
    const isSelf = myAthlete?.id === targetAthleteId;
    if (!isOwner && !isSelf) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    // Ega o'zi (kapitan) chiqa olmaydi — avval jamoani o'chirsin yoki egalikni o'tkazsin
    const targetMember = await memberInTeam(targetAthleteId, id);
    if (!targetMember) return NextResponse.json({ error: "A'zo topilmadi" }, { status: 404 });
    const targetProfile = await prisma.esAthlete.findUnique({ where: { id: targetAthleteId }, select: { humoProfileId: true } });
    if (targetProfile?.humoProfileId === team.ownerId) {
        return NextResponse.json({ error: "Ega tarkibdan chiqa olmaydi (jamoani o'chiring)" }, { status: 400 });
    }

    await prisma.esRosterMember.delete({ where: { id: targetMember.id } });
    return NextResponse.json({ ok: true });
}
