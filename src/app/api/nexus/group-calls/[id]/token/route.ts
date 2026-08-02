// LiveKit ulanish tokenini olish (join). Ishtirokchi upsert qilinadi.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLiveKitToken, getLiveKitConfig } from "@/lib/livekit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
    const { id } = await params;
    const cfg = getLiveKitConfig();
    if (!cfg) return NextResponse.json({ error: "LiveKit sozlanmagan" }, { status: 503 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const call = await prisma.nexusGroupCall.findUnique({
        where: { id },
        select: { roomName: true, hostId: true, status: true },
    });
    if (!call) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (call.status !== "ACTIVE") return NextResponse.json({ error: "Chaqiruv tugagan" }, { status: 409 });

    // Ishtirokchi yozuvi (upsert)
    await prisma.nexusGroupCallParticipant.upsert({
        where: { groupCallId_profileId: { groupCallId: id, profileId: me.id } },
        create: { groupCallId: id, profileId: me.id, role: call.hostId === me.id ? "HOST" : "GUEST" },
        update: { leftAt: null }, // qayta kirsa "hozir" belgilash
    });

    const displayName = me.name || (me.username ? `@${me.username}` : me.id);
    const token = await createLiveKitToken({
        roomName: call.roomName,
        identity: me.id,
        name: displayName,
    });
    if (!token) return NextResponse.json({ error: "Token yaratilmadi" }, { status: 500 });

    return NextResponse.json({ token, url: cfg.url, roomName: call.roomName, identity: me.id });
}
