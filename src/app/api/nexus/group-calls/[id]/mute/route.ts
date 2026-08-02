// Ishtirokchi mikrofoni/kamerasini mute qilish (faqat host).
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
    const source: "audio" | "video" = body?.source === "video" ? "video" : "audio";
    if (!identity) return NextResponse.json({ error: "Identity yo'q" }, { status: 400 });

    const call = await prisma.nexusGroupCall.findUnique({
        where: { id }, select: { roomName: true, hostId: true, status: true },
    });
    if (!call) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (call.hostId !== me.id) return NextResponse.json({ error: "Faqat host" }, { status: 403 });
    if (call.status !== "ACTIVE") return NextResponse.json({ error: "Chaqiruv tugagan" }, { status: 409 });

    const httpUrl = cfg.url.replace(/^ws/, "http");
    const svc = new RoomServiceClient(httpUrl, cfg.apiKey, cfg.apiSecret);
    try {
        // Ishtirokchining tanlangan turdagi published track'larini topib mute qilish
        const participant = await svc.getParticipant(call.roomName, identity);
        for (const t of participant.tracks) {
            const kind = t.source === 1 ? "audio" : t.source === 2 ? "video" : (t.type === 0 ? "audio" : "video");
            if ((source === "audio" && kind === "audio") || (source === "video" && kind === "video")) {
                await svc.mutePublishedTrack(call.roomName, identity, t.sid, true).catch(() => { });
            }
        }
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Mute xatosi" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
