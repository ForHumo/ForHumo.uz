import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { currencyForCountry } from "@/lib/money";

const SELECT = { id: true, name: true, username: true, image: true, coverImage: true, bio: true, humoId: true, verified: true, subPrice: true, country: true } as const;

// GET /api/nexus/profile?username=X  (username yo'q bo'lsa — sessiya egasi)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    // Joriy sessiya egasi (ixtiyoriy)
    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    // Maqsad profil
    const target = username
        ? await prisma.userProfile.findUnique({ where: { username }, select: SELECT })
        : (meId ? await prisma.userProfile.findUnique({ where: { id: meId }, select: SELECT }) : null);

    if (!target) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

    const [posts, followers, following, likes, videos, tracks, lives] = await prisma.$transaction([
        prisma.nexusPost.count({ where: { profileId: target.id, hidden: false } }),
        prisma.nexusFollow.count({ where: { followingId: target.id } }),
        prisma.nexusFollow.count({ where: { followerId: target.id } }),
        prisma.nexusLike.count({ where: { post: { profileId: target.id, hidden: false } } }),
        prisma.nexusVideo.count({ where: { profileId: target.id, hidden: false } }),
        prisma.nexusTrack.count({ where: { profileId: target.id, hidden: false } }),
        prisma.nexusLiveStream.count({ where: { profileId: target.id, hidden: false, privacy: "PUBLIC" } }),
    ]);

    let isFollowing = false, iBlocked = false, blockedMe = false, iMuted = false;
    let subscribed = false, subExpiresAt: Date | null = null;
    if (meId && meId !== target.id) {
        const [f, bOut, bIn, m, sub] = await prisma.$transaction([
            prisma.nexusFollow.findUnique({ where: { followerId_followingId: { followerId: meId, followingId: target.id } } }),
            prisma.nexusBlock.findUnique({ where: { blockerId_blockedId: { blockerId: meId, blockedId: target.id } } }),
            prisma.nexusBlock.findUnique({ where: { blockerId_blockedId: { blockerId: target.id, blockedId: meId } } }),
            prisma.nexusMute.findUnique({ where: { muterId_mutedId: { muterId: meId, mutedId: target.id } } }),
            prisma.nexusSubscription.findUnique({ where: { subscriberId_creatorId: { subscriberId: meId, creatorId: target.id } } }),
        ]);
        isFollowing = !!f;
        iBlocked = !!bOut;
        blockedMe = !!bIn;
        iMuted = !!m;
        if (sub && sub.expiresAt.getTime() > Date.now()) { subscribed = true; subExpiresAt = sub.expiresAt; }
    }

    return NextResponse.json({
        profile: {
            name: target.name, username: target.username, image: target.image,
            coverImage: target.coverImage, bio: target.bio, humoId: target.humoId,
            verified: isVerifiedProfile(target),
            subPrice: target.subPrice,
            subCurrency: currencyForCountry(target.country),
        },
        stats: { posts, followers, following, likes, videos, tracks, lives },
        isFollowing,
        isMe: meId === target.id,
        iBlocked, blockedMe, iMuted,
        subscribed, subExpiresAt,
    });
}
