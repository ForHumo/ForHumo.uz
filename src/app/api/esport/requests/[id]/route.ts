import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";

// POST /api/esport/requests/[id] — javob { action: approve|reject }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const r = await prisma.esRequest.findUnique({ where: { id } });
    if (!r || r.status !== "PENDING") return NextResponse.json({ error: "So'rov topilmadi yoki yopilgan" }, { status: 404 });

    const team = await prisma.esTeam.findUnique({ where: { id: r.teamId }, select: { id: true, ownerId: true } });
    if (!team) return NextResponse.json({ error: "Jamoa topilmadi" }, { status: 404 });
    const { action } = await req.json();
    const myAthlete = await prisma.esAthlete.findUnique({ where: { humoProfileId: me.id }, select: { id: true } });
    const isOwner = team.ownerId === me.id;

    if (r.type === "LEAVE") {
        if (!isOwner) return NextResponse.json({ error: "Faqat jamoa egasi tasdiqlaydi" }, { status: 403 });
        if (action === "approve") {
            if (r.athleteId) await prisma.esRosterMember.deleteMany({ where: { athleteId: r.athleteId } });
            await prisma.esRequest.update({ where: { id }, data: { status: "APPROVED" } });
            return NextResponse.json({ ok: true, message: "Sportchi jamoadan chiqarildi" });
        }
        await prisma.esRequest.update({ where: { id }, data: { status: "REJECTED" } });
        return NextResponse.json({ ok: true, message: "Rad etildi" });
    }

    if (r.type === "KICK") {
        if (!myAthlete || myAthlete.id !== r.athleteId) return NextResponse.json({ error: "Faqat tegishli sportchi javob beradi" }, { status: 403 });
        if (action === "approve") {
            await prisma.esRosterMember.deleteMany({ where: { athleteId: r.athleteId } });
            await prisma.esRequest.update({ where: { id }, data: { status: "APPROVED" } });
            return NextResponse.json({ ok: true, message: "Jamoadan chiqdingiz" });
        }
        await prisma.esRequest.update({ where: { id }, data: { status: "REJECTED" } });
        return NextResponse.json({ ok: true, message: "Rad etildi" });
    }

    if (r.type === "TEAM_DELETE") {
        // Faqat ega bo'lmagan a'zolar ovoz beradi
        const rosters = await prisma.esRoster.findMany({ where: { teamId: r.teamId }, select: { members: { select: { athleteId: true, athlete: { select: { humoProfileId: true } } } } } });
        const members = rosters.flatMap(x => x.members);
        const others = members.filter(m => m.athlete.humoProfileId !== team.ownerId);
        const meMember = myAthlete && others.find(m => m.athleteId === myAthlete.id);
        if (!meMember) return NextResponse.json({ error: "Siz ovoz bera olmaysiz" }, { status: 403 });

        if (action === "reject") {
            await prisma.esRequest.update({ where: { id }, data: { status: "REJECTED" } });
            return NextResponse.json({ ok: true, message: "O'chirish bekor qilindi" });
        }
        // approve — ovozni qayd etamiz
        await prisma.esRequestApproval.upsert({
            where: { requestId_athleteId: { requestId: id, athleteId: myAthlete!.id } },
            create: { requestId: id, athleteId: myAthlete!.id }, update: {},
        });
        const approvals = await prisma.esRequestApproval.count({ where: { requestId: id } });
        if (approvals >= others.length) {
            await prisma.esTeam.delete({ where: { id: r.teamId } }); // cascade: rosterlar/a'zolar/so'rovlar
            return NextResponse.json({ ok: true, deleted: true, message: "Barcha rozi — jamoa o'chirildi" });
        }
        return NextResponse.json({ ok: true, message: `Ovoz qabul qilindi (${approvals}/${others.length})` });
    }

    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
}

// DELETE /api/esport/requests/[id] — tashabbuskor bekor qiladi
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    const r = await prisma.esRequest.findUnique({ where: { id }, select: { initiatedBy: true, status: true } });
    if (!r || r.status !== "PENDING") return NextResponse.json({ error: "So'rov topilmadi" }, { status: 404 });
    if (r.initiatedBy !== me.id) return NextResponse.json({ error: "Faqat tashabbuskor bekor qiladi" }, { status: 403 });
    await prisma.esRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ ok: true });
}
