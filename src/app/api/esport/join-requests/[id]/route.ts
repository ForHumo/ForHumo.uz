import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMyProfile } from "@/lib/esport";
import { addAthleteToTeam, ADD_MSG } from "@/lib/esport-roster";
import { esNotify, athleteProfileId } from "@/lib/esport-notify";

// POST /api/esport/join-requests/[id] — arizani ko'rib chiqish (ega) { action: accept|reject }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const me = await getMyProfile();
    if (!me) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });

    const jr = await prisma.esJoinRequest.findUnique({
        where: { id },
        include: { team: { select: { id: true, ownerId: true } } },
    });
    if (!jr) return NextResponse.json({ error: "Ariza topilmadi" }, { status: 404 });
    if (jr.team.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const { action } = await req.json();
    if (action === "reject") {
        await prisma.esJoinRequest.update({ where: { id }, data: { status: "REJECTED" } });
        await esNotify(await athleteProfileId(jr.athleteId), { type: "JOIN_RESULT", title: "Ariza rad etildi", body: "Jamoaga qo'shilish arizangiz rad etildi", href: "/esport/teams" });
        return NextResponse.json({ ok: true, status: "REJECTED" });
    }
    if (action === "accept") {
        const result = await addAthleteToTeam(jr.athleteId, jr.team.id);
        if (result !== "ok") return NextResponse.json({ error: ADD_MSG[result] }, { status: 400 });
        await prisma.esJoinRequest.update({ where: { id }, data: { status: "ACCEPTED" } });
        await esNotify(await athleteProfileId(jr.athleteId), { type: "JOIN_RESULT", title: "Jamoaga qabul qilindingiz", body: "Arizangiz tasdiqlandi — jamoaga qo'shildingiz", href: `/esport/teams/${jr.team.id}` });
        return NextResponse.json({ ok: true, status: "ACCEPTED" });
    }
    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
}
