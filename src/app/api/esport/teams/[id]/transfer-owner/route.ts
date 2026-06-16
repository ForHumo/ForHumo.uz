import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import { esNotify } from "@/lib/esport-notify";

// POST /api/esport/teams/[id]/transfer-owner — egalikni o'tkazish (faqat ega) { profileId }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const team = await prisma.esTeam.findUnique({ where: { id }, select: { ownerId: true } });
    if (!team || team.ownerId !== me.id) return NextResponse.json({ error: "Faqat jamoa egasi" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    const profileId = String(b.profileId || "");
    if (!profileId) return NextResponse.json({ error: "profileId kerak" }, { status: 400 });
    if (profileId === me.id) return NextResponse.json({ error: "Siz allaqachon egasiz" }, { status: 400 });

    // Yangi ega jamoaga bog'liq bo'lishi shart (roster a'zosi yoki rahbar/staff)
    const isStaff = await prisma.esTeamStaff.findFirst({ where: { teamId: id, profileId }, select: { id: true } });
    let isMember = false;
    if (!isStaff) {
        const ath = await prisma.esAthlete.findUnique({ where: { humoProfileId: profileId }, select: { id: true } });
        if (ath) {
            const m = await prisma.esRosterMember.findFirst({ where: { athleteId: ath.id, roster: { teamId: id } }, select: { id: true } });
            isMember = !!m;
        }
    }
    if (!isStaff && !isMember) return NextResponse.json({ error: "Yangi ega jamoa a'zosi yoki rahbari bo'lishi kerak" }, { status: 400 });

    // Bitta odam = bitta jamoa egasi
    const ownsOther = await prisma.esTeam.count({ where: { ownerId: profileId, id: { not: id } } });
    if (ownsOther > 0) return NextResponse.json({ error: "Bu odam boshqa jamoa egasi" }, { status: 409 });

    await prisma.$transaction(async tx => {
        await tx.esTeam.update({ where: { id }, data: { ownerId: profileId } });
        await tx.esTeamStaff.deleteMany({ where: { teamId: id, profileId } }); // yangi ega lavozimdan chiqadi
    });
    await esNotify(profileId, { type: "TEAM_OWNER", title: "Jamoa egaligi", body: "Sizga jamoa egaligi o'tkazildi", href: `/esport/teams/${id}` });
    return NextResponse.json({ ok: true });
}
