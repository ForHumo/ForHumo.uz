import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import type { NexusVideo } from "@prisma/client";

type VideoWithCount = NexusVideo & { _count: { likes: number; comments: number } };

const VIDEO_INCLUDE = { _count: { select: { likes: true as const, comments: true as const } } };

// GET /api/nexus/videos/library — Mening videolarim: yuklaganlarim + keyinroq ko'rish + so'nggi ko'rilgan
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const [mineRows, wlRows, histRows] = await Promise.all([
        prisma.nexusVideo.findMany({
            where: { profileId: me.id }, orderBy: { createdAt: "desc" }, take: 40, include: VIDEO_INCLUDE,
        }),
        prisma.nexusWatchLater.findMany({
            where: { profileId: me.id }, orderBy: { createdAt: "desc" }, take: 40, select: { videoId: true },
        }),
        prisma.nexusVideoView.findMany({
            where: { profileId: me.id }, orderBy: { createdAt: "desc" }, take: 40, select: { videoId: true },
        }),
    ]);

    // Watch-later va tarix videolarini tartibni saqlagan holda yuklash
    const extraIds = [...new Set([...wlRows.map(w => w.videoId), ...histRows.map(h => h.videoId)])];
    const extraVids = extraIds.length
        ? await prisma.nexusVideo.findMany({ where: { id: { in: extraIds }, hidden: false }, include: VIDEO_INCLUDE })
        : [];
    const vidMap = new Map<string, VideoWithCount>(extraVids.map(v => [v.id, v]));
    for (const v of mineRows) vidMap.set(v.id, v);

    // Mualliflar
    const authorIds = [...new Set([...vidMap.values()].map(v => v.profileId))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    const savedSet = new Set(wlRows.map(w => w.videoId));

    // Xarid holati (pullik video qulfi uchun)
    const allIds = [...vidMap.keys()];
    const purchases = allIds.length
        ? await prisma.nexusVideoPurchase.findMany({ where: { buyerId: me.id, videoId: { in: allIds } }, select: { videoId: true } })
        : [];
    const boughtSet = new Set(purchases.map(p => p.videoId));

    function shape(v: VideoWithCount) {
        const p = pMap[v.profileId] as (typeof profs)[number] | undefined;
        const locked = v.priceZij > 0 && v.profileId !== me!.id && !boughtSet.has(v.id);
        return {
            id: v.id, title: v.title, thumbUrl: v.thumbUrl, videoUrl: locked ? "" : v.videoUrl,
            durationSec: v.durationSec, kind: v.kind, orientation: v.orientation,
            priceZij: v.priceZij, isMature: v.isMature, isSaved: savedSet.has(v.id), locked,
            views: v.views, createdAt: v.createdAt,
            likeCount: v._count.likes, commentCount: v._count.comments,
            author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
        };
    }
    const pick = (ids: string[]) => ids.map(id => vidMap.get(id)).filter((v): v is VideoWithCount => !!v).map(shape);

    return NextResponse.json({
        mine: mineRows.map(shape),
        watchLater: pick(wlRows.map(w => w.videoId)),
        history: pick(histRows.map(h => h.videoId)),
    });
}
