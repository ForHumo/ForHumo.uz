import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currencyForCountry } from "@/lib/money";

// GET /api/nexus/analytics — ijodkorning auditoriya / daromad / kontent statistikasi (faqat o'zi)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, subPrice: true, country: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    const id = me.id;
    const now = new Date();

    const [
        followers, activeSubs, subSum,
        tipsAgg, salesAgg,
        videoCount, videoViews, videoLikes,
        trackCount, trackPlays,
        postCount, postLikes,
        liveCount,
        recentTips,
    ] = await prisma.$transaction([
        // Auditoriya
        prisma.nexusFollow.count({ where: { followingId: id } }),
        prisma.nexusSubscription.count({ where: { creatorId: id, expiresAt: { gt: now } } }),
        prisma.nexusSubscription.aggregate({ where: { creatorId: id, expiresAt: { gt: now } }, _sum: { price: true } }),
        // Daromad
        prisma.nexusTip.aggregate({ where: { recipientId: id }, _sum: { amount: true } }),
        prisma.nexusVideoPurchase.aggregate({ where: { video: { profileId: id } }, _sum: { price: true } }),
        // Kontent — video
        prisma.nexusVideo.count({ where: { profileId: id, hidden: false } }),
        prisma.nexusVideo.aggregate({ where: { profileId: id, hidden: false }, _sum: { views: true } }),
        prisma.nexusVideoLike.count({ where: { video: { profileId: id } } }),
        // Audio
        prisma.nexusTrack.count({ where: { profileId: id, hidden: false } }),
        prisma.nexusTrack.aggregate({ where: { profileId: id, hidden: false }, _sum: { plays: true } }),
        // Postlar
        prisma.nexusPost.count({ where: { profileId: id, hidden: false } }),
        prisma.nexusLike.count({ where: { post: { profileId: id, hidden: false } } }),
        // Jonli
        prisma.nexusLiveStream.count({ where: { profileId: id } }),
        // So'nggi tip'lar (oxirgi 8)
        prisma.nexusTip.findMany({ where: { recipientId: id }, orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

    const tipsTotal = tipsAgg._sum.amount ?? 0;
    const salesTotal = salesAgg._sum.price ?? 0;
    const subMonthly = subSum._sum.price ?? 0;

    // So'nggi tip donorlari
    const donorIds = [...new Set(recentTips.map(t => t.donorId))];
    const donors = donorIds.length
        ? await prisma.userProfile.findMany({ where: { id: { in: donorIds } }, select: { id: true, name: true, username: true, image: true } })
        : [];
    const dMap = Object.fromEntries(donors.map(d => [d.id, d]));

    return NextResponse.json({
        currency: currencyForCountry(me.country),
        subPriceEnabled: me.subPrice > 0,
        audience: { followers, subscribers: activeSubs, subMonthly },
        earnings: {
            tips: tipsTotal,
            videoSales: salesTotal,
            subMonthly,
            total: tipsTotal + salesTotal,    // bir martalik (tips + sotuv); obuna oylik takrorlanuvchi alohida
        },
        content: {
            videos: videoCount, videoViews: videoViews._sum.views ?? 0, videoLikes,
            tracks: trackCount, trackPlays: trackPlays._sum.plays ?? 0,
            posts: postCount, postLikes,
            lives: liveCount,
        },
        recentTips: recentTips.map(t => {
            const d = dMap[t.donorId];
            return {
                id: t.id, amount: t.amount, message: t.message, targetType: t.targetType, createdAt: t.createdAt,
                donor: d ? { name: d.name, username: d.username, image: d.image } : null,
            };
        }),
    });
}
