import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/nexus/videos/[id] — bitta video + tavsiya
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const video = await prisma.nexusVideo.findUnique({
        where: { id },
        include: { _count: { select: { likes: true, comments: true } } },
    });
    if (!video) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }
    if (video.hidden && video.profileId !== meId) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const author = await prisma.userProfile.findUnique({
        where: { id: video.profileId }, select: { id: true, name: true, username: true, image: true, humoId: true },
    });

    let isLiked = false, isSubscribed = false;
    if (meId) {
        const [lk, fl] = await Promise.all([
            prisma.nexusVideoLike.findUnique({ where: { videoId_profileId: { videoId: id, profileId: meId } } }),
            prisma.nexusFollow.findUnique({ where: { followerId_followingId: { followerId: meId, followingId: video.profileId } } }),
        ]);
        isLiked = !!lk; isSubscribed = !!fl;
    }

    // Tavsiya — shu turdagi boshqa videolar
    const recRows = await prisma.nexusVideo.findMany({
        where: { hidden: false, kind: video.kind, id: { not: id } },
        orderBy: [{ views: "desc" }, { createdAt: "desc" }], take: 8,
    });
    const recAuthorIds = [...new Set(recRows.map(r => r.profileId))];
    const recProfs = await prisma.userProfile.findMany({ where: { id: { in: recAuthorIds } }, select: { id: true, name: true, username: true, image: true } });
    const recMap = Object.fromEntries(recProfs.map(p => [p.id, p]));
    const recommended = recRows.map(r => ({
        id: r.id, title: r.title, thumbUrl: r.thumbUrl, durationSec: r.durationSec, views: r.views,
        author: recMap[r.profileId] ? { name: recMap[r.profileId].name, username: recMap[r.profileId].username, image: recMap[r.profileId].image } : null,
    }));

    return NextResponse.json({
        video: {
            id: video.id, title: video.title, description: video.description,
            videoUrl: video.videoUrl, thumbUrl: video.thumbUrl, durationSec: video.durationSec,
            kind: video.kind, category: video.category, views: video.views, createdAt: video.createdAt,
            likeCount: video._count.likes, commentCount: video._count.comments,
            isLiked, isSubscribed, isMine: video.profileId === meId,
            author: author ? { name: author.name, username: author.username, image: author.image, verified: isVerifiedProfile(author) } : null,
        },
        recommended,
    });
}

// DELETE /api/nexus/videos/[id] — o'z videosini o'chirish
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { id } = await params;
    await prisma.nexusVideo.deleteMany({ where: { id, profileId: me.id } });
    return NextResponse.json({ ok: true });
}
