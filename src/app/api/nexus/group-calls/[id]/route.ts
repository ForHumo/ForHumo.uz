import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteLiveKitRoom } from "@/lib/livekit";

type Ctx = { params: Promise<{ id: string }> };

// GET — chaqiruv ma'lumoti + ishtirokchilar
export async function GET(_req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const call = await prisma.nexusGroupCall.findUnique({
        where: { id },
        include: {
            participants: {
                orderBy: { joinedAt: "asc" },
            },
        },
    });
    if (!call) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    // Ishtirokchilar profilini yuklash
    const profIds = call.participants.map(p => p.profileId);
    const profs = profIds.length
        ? await prisma.userProfile.findMany({ where: { id: { in: profIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true } })
        : [];
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    return NextResponse.json({
        call: {
            id: call.id, roomName: call.roomName, title: call.title,
            status: call.status, hostId: call.hostId,
            createdAt: call.createdAt, endedAt: call.endedAt,
            isHost: call.hostId === me.id,
            participants: call.participants.map(p => ({
                id: p.id, role: p.role, joinedAt: p.joinedAt, leftAt: p.leftAt,
                profile: pMap[p.profileId] || null,
            })),
        },
    });
}

// PATCH — chaqiruvni tugatish (faqat host)
export async function PATCH(req: Request, { params }: Ctx) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action;

    const call = await prisma.nexusGroupCall.findUnique({ where: { id }, select: { hostId: true, roomName: true, status: true } });
    if (!call) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    if (action === "end") {
        if (call.hostId !== me.id) return NextResponse.json({ error: "Faqat host tugata oladi" }, { status: 403 });
        if (call.status === "ENDED") return NextResponse.json({ ok: true });
        await prisma.nexusGroupCall.update({ where: { id }, data: { status: "ENDED", endedAt: new Date() } });
        await deleteLiveKitRoom(call.roomName).catch(() => { });
        return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Yaroqsiz amal" }, { status: 400 });
}
