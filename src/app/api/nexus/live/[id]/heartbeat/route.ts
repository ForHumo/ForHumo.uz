import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VIEWER_WINDOW_MS = 30_000;

// POST /api/nexus/live/[id]/heartbeat — "men ko'rib turibman" (har ~10s).
// Javobda joriy onlayn ko'ruvchilar soni; peakViewers yangilanadi.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { id: true, status: true, peakViewers: true } });
    if (!stream) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    await prisma.nexusLiveViewer.upsert({
        where: { streamId_profileId: { streamId: id, profileId: me.id } },
        create: { streamId: id, profileId: me.id },
        update: { lastSeenAt: new Date() },
    });

    const since = new Date(Date.now() - VIEWER_WINDOW_MS);
    const viewers = await prisma.nexusLiveViewer.count({ where: { streamId: id, lastSeenAt: { gt: since } } });
    if (viewers > stream.peakViewers) {
        await prisma.nexusLiveStream.update({ where: { id }, data: { peakViewers: viewers } });
    }

    return NextResponse.json({ viewers });
}
