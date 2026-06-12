import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

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
        where: { id: stream.profileId }, select: { id: true, name: true, username: true, image: true, humoId: true },
    });

    const since = new Date(Date.now() - VIEWER_WINDOW_MS);
    const viewers = await prisma.nexusLiveViewer.count({
        where: { streamId: id, lastSeenAt: { gt: since } },
    });

    return NextResponse.json({
        stream: {
            id: stream.id, title: stream.title, category: stream.category,
            privacy: stream.privacy, status: stream.status,
            scheduledAt: stream.scheduledAt, startedAt: stream.startedAt, endedAt: stream.endedAt,
            viewers, peakViewers: stream.peakViewers, likes: stream.likes,
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
    const { action } = await req.json();
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
            where: { id }, data: { status: "ENDED", endedAt: new Date() },
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
    return NextResponse.json({ ok: true });
}
