// Ishtirokchini xonadan chiqarish (faqat host).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoomServiceClient } from "livekit-server-sdk";
import { getLiveKitConfig } from "@/lib/livekit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;
    const cfg = getLiveKitConfig();
    if (!cfg) return NextResponse.json({ error: "LiveKit sozlanmagan" }, { status: 503 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Kirish talab" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const identity: string = body?.identity;
    if (!identity) return NextResponse.json({ error: "Identity yo'q" }, { status: 400 });
    if (identity === me.id) return NextResponse.json({ error: "O'zingizni chiqara olmaysiz" }, { status: 400 });

    const call = await prisma.nexusGroupCall.findUnique({
        where: { id }, select: { roomName: true, hostId: true, status: true },
    });
    if (!call) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (call.hostId !== me.id) return NextResponse.json({ error: "Faqat host" }, { status: 403 });
    if (call.status !== "ACTIVE") return NextResponse.json({ error: "Chaqiruv tugagan" }, { status: 409 });

    const httpUrl = cfg.url.replace(/^ws/, "http");
    const svc = new RoomServiceClient(httpUrl, cfg.apiKey, cfg.apiSecret);
    try {
        await svc.removeParticipant(call.roomName, identity);
        await prisma.nexusGroupCallParticipant.updateMany({
            where: { groupCallId: id, profileId: identity, leftAt: null },
            data: { leftAt: new Date() },
        });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Kick xatosi" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
