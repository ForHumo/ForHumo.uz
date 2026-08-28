import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { deleteLiveKitRoom } from "@/lib/livekit";

const VIEWER_WINDOW_MS = 30_000;

// GET /api/nexus/live/[id] — efir tafsiloti
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    // Moderatsiya yashirgan efir — egasidan boshqaga ko'rinmaydi
    if (stream.hidden && stream.profileId !== meId) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const author = await prisma.userProfile.findUnique({
        where: { id: stream.profileId }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });

    const since = new Date(Date.now() - VIEWER_WINDOW_MS);
    const viewers = await prisma.nexusLiveViewer.count({
        where: { streamId: id, lastSeenAt: { gt: since } },
    });

    return NextResponse.json({
        stream: {
            id: stream.id, title: stream.title, description: stream.description, thumbUrl: stream.thumbUrl,
            category: stream.category,
            privacy: stream.privacy, status: stream.status,
            scheduledAt: stream.scheduledAt, startedAt: stream.startedAt, endedAt: stream.endedAt,
            viewers, peakViewers: stream.peakViewers, likes: stream.likes,
            recordingUrl: stream.recordingUrl, recordingDurationSec: stream.recordingDurationSec,
            sceneLayout: stream.sceneLayout,
            isMine: stream.profileId === meId,
            author: author ? { name: author.name, username: author.username, image: author.image, verified: isVerifiedProfile(author) } : null,
        },
    });
}

// PATCH /api/nexus/live/[id] — efirni boshqarish (ega): start (UPCOMING->LIVE) / end
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const body = await req.json();
    const { action, recordingUrl, recordingDurationSec, description, thumbUrl } = body;
    const stream = await prisma.nexusLiveStream.findFirst({ where: { id, profileId: me.id } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    if (action === "start" && stream.status === "UPCOMING") {
        const updated = await prisma.nexusLiveStream.update({
            where: { id }, data: { status: "LIVE", startedAt: new Date() },
        });
        return NextResponse.json({ stream: updated });
    }
    if (action === "end" && stream.status !== "ENDED") {
        const updated = await prisma.nexusLiveStream.update({
            where: { id }, data: {
                status: "ENDED", endedAt: new Date(),
                ...(typeof recordingUrl === "string" && recordingUrl ? { recordingUrl } : {}),
                ...(Number.isFinite(recordingDurationSec) ? { recordingDurationSec: Math.max(0, Math.round(Number(recordingDurationSec))) } : {}),
            },
        });
        // LiveKit xonasini tozalash (fail-safe)
        deleteLiveKitRoom(`live_${id}`).catch(() => { });
        return NextResponse.json({ stream: updated });
    }
    // Meta yangilash — tavsif/thumb/recording alohida ("update")
    if (action === "update") {
        const updated = await prisma.nexusLiveStream.update({
            where: { id },
            data: {
                ...(typeof description === "string" ? { description: description.slice(0, 2000) || null } : {}),
                ...(typeof thumbUrl === "string" ? { thumbUrl: thumbUrl || null } : {}),
                ...(typeof recordingUrl === "string" ? { recordingUrl: recordingUrl || null } : {}),
                ...(Number.isFinite(recordingDurationSec) ? { recordingDurationSec: Math.max(0, Math.round(Number(recordingDurationSec))) } : {}),
            },
        });
        return NextResponse.json({ stream: updated });
    }
    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
}

// DELETE /api/nexus/live/[id] — o'z efirini o'chirish
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    await prisma.nexusLiveStream.deleteMany({ where: { id, profileId: me.id } });
    deleteLiveKitRoom(`live_${id}`).catch(() => { });
    return NextResponse.json({ ok: true });
}
