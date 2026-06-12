import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile, isAdultBirthday } from "@/lib/nexus";

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
    let adult = false;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, birthday: true } });
        meId = me?.id ?? null;
        adult = isAdultBirthday(me?.birthday);
    }
    if (video.hidden && video.profileId !== meId) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    // 18+ — faqat tasdiqlangan kattalar (ega bundan mustasno)
    if (video.isMature && video.profileId !== meId && !adult) {
        return NextResponse.json({ error: "Bu kontent 18+ — yosh cheklovi" }, { status: 403 });
    }

    const author = await prisma.userProfile.findUnique({
        where: { id: video.profileId }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });

    let isLiked = false, isSubscribed = false, isPurchased = false;
    if (meId) {
        const [lk, fl, pu] = await Promise.all([
            prisma.nexusVideoLike.findUnique({ where: { videoId_profileId: { videoId: id, profileId: meId } } }),
            prisma.nexusFollow.findUnique({ where: { followerId_followingId: { followerId: meId, followingId: video.profileId } } }),
            prisma.nexusVideoPurchase.findUnique({ where: { videoId_buyerId: { videoId: id, buyerId: meId } } }),
        ]);
        isLiked = !!lk; isSubscribed = !!fl; isPurchased = !!pu;
    }

    // Pullik video — sotib olinmaguncha videoUrl berilmaydi
    const locked = video.priceZij > 0 && video.profileId !== meId && !isPurchased;

    // Seriya — oldingi/keyingi qism
    const partSelect = { id: true, title: true, thumbUrl: true, durationSec: true, views: true } as const;
    const [prevPart, nextPart] = await Promise.all([
        video.prevVideoId
            ? prisma.nexusVideo.findFirst({ where: { id: video.prevVideoId, hidden: false }, select: partSelect })
            : Promise.resolve(null),
        prisma.nexusVideo.findFirst({ where: { prevVideoId: id, hidden: false }, orderBy: { createdAt: "asc" }, select: partSelect }),
    ]);

    // Tavsiya — shu turdagi boshqa videolar (18+ ham shu yerda filtrlanadi)
    const recRows = await prisma.nexusVideo.findMany({
        where: { hidden: false, kind: video.kind, id: { not: id }, ...(adult ? {} : { isMature: false }) },
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
            videoUrl: locked ? "" : video.videoUrl, thumbUrl: video.thumbUrl, durationSec: video.durationSec,
            kind: video.kind, orientation: video.orientation, category: video.category,
            tags: video.tags, descImages: video.descImages, isMature: video.isMature,
            priceZij: video.priceZij, prevVideoId: video.prevVideoId, locked,
            series: { prev: prevPart, next: nextPart },
            views: video.views, createdAt: video.createdAt,
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
