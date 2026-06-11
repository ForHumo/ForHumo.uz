import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/nexus/videos/[id]/watch-later — "Keyinroq ko'rish" toggle
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    const video = await prisma.nexusVideo.findUnique({ where: { id }, select: { id: true, hidden: true } });
    if (!video || video.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const existing = await prisma.nexusWatchLater.findUnique({
        where: { profileId_videoId: { profileId: me.id, videoId: id } },
    });
    if (existing) {
        await prisma.nexusWatchLater.delete({ where: { id: existing.id } });
        return NextResponse.json({ saved: false });
    }
    await prisma.nexusWatchLater.create({ data: { profileId: me.id, videoId: id } });
    return NextResponse.json({ saved: true });
}
