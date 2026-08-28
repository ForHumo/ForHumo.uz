// GET /api/nexus/profile/activity — o'zimning so'nggi 3 post + 3 video + 3 trek
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ posts: [], videos: [], tracks: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ posts: [], videos: [], tracks: [] });

    const [posts, videos, tracks] = await Promise.all([
        prisma.nexusPost.findMany({
            where: { profileId: me.id, hidden: false },
            orderBy: { createdAt: "desc" }, take: 3,
            select: {
                id: true, text: true, media: true, createdAt: true,
                _count: { select: { likes: true, comments: true } },
            },
        }),
        prisma.nexusVideo.findMany({
            where: { profileId: me.id, hidden: false },
            orderBy: { createdAt: "desc" }, take: 3,
            select: { id: true, title: true, thumbUrl: true, durationSec: true, views: true, orientation: true },
        }),
        prisma.nexusTrack.findMany({
            where: { profileId: me.id, hidden: false },
            orderBy: { createdAt: "desc" }, take: 3,
            select: { id: true, title: true, coverUrl: true, plays: true, durationSec: true },
        }),
    ]);

    return NextResponse.json({
        posts: posts.map(p => ({ id: p.id, text: p.text, media: p.media, createdAt: p.createdAt, likes: p._count.likes, comments: p._count.comments })),
        videos,
        tracks,
    });
}
