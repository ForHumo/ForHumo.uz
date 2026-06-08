import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isVerifiedProfile, extractHashtags } from "@/lib/nexus";

async function myProfileId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const p = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    return p?.id ?? null;
}

interface AttachedProduct { slug: string; name: string; image: string | null; price: string; oldPrice: string | null }
async function loadAttachedProducts(ids: (string | null)[]): Promise<Record<string, AttachedProduct>> {
    const productIds = [...new Set(ids.filter((x): x is string => !!x))];
    if (!productIds.length) return {};
    const prods = await prisma.marketProduct.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true, slug: true, name: true, images: true, price: true, oldPrice: true },
    });
    return Object.fromEntries(prods.map(p => [p.id, {
        slug: p.slug, name: p.name, image: p.images?.[0] ?? null,
        price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : null,
    }]));
}

// GET /api/nexus/posts?tab=explore|following&offset=&limit=
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "explore";
    const tag = searchParams.get("tag") ?? undefined;          // hashtag bo'yicha filtr
    const author = searchParams.get("author") ?? undefined;     // username bo'yicha profil posti
    const limit = Math.min(Number(searchParams.get("limit") ?? 15), 30);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const myId = await myProfileId();

    const where: Prisma.NexusPostWhereInput = {};
    if (tag) where.hashtags = { has: tag };
    if (author) {
        const a = await prisma.userProfile.findUnique({ where: { username: author }, select: { id: true } });
        where.profileId = a?.id ?? "__none__";
    } else if (tab === "following" && myId) {
        const follows = await prisma.nexusFollow.findMany({ where: { followerId: myId }, select: { followingId: true } });
        where.profileId = { in: [...follows.map(f => f.followingId), myId] };
    }

    const [posts, total] = await prisma.$transaction([
        prisma.nexusPost.findMany({
            where, orderBy: { createdAt: "desc" }, take: limit, skip: offset,
            include: { _count: { select: { likes: true, comments: true } } },
        }),
        prisma.nexusPost.count({ where }),
    ]);

    const profileIds = [...new Set(posts.map(p => p.profileId))];
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true, humoId: true },
    });
    const pMap = Object.fromEntries(profiles.map(p => [p.id, p]));

    let likedIds: string[] = [], savedIds: string[] = [];
    if (myId && posts.length) {
        const ids = posts.map(p => p.id);
        const [likes, saves] = await prisma.$transaction([
            prisma.nexusLike.findMany({ where: { profileId: myId, postId: { in: ids } }, select: { postId: true } }),
            prisma.nexusSave.findMany({ where: { profileId: myId, postId: { in: ids } }, select: { postId: true } }),
        ]);
        likedIds = likes.map(l => l.postId);
        savedIds = saves.map(s => s.postId);
    }

    // Biriktirilgan Market mahsulotlari ("Sotib olish")
    const prodMap = await loadAttachedProducts(posts.map(p => p.marketProductId));

    const enriched = posts.map(p => {
        const a = pMap[p.profileId];
        return {
            id: p.id, text: p.text, media: p.media, hashtags: p.hashtags,
            marketProductId: p.marketProductId, shareCount: p.shareCount, createdAt: p.createdAt,
            product: p.marketProductId ? prodMap[p.marketProductId] ?? null : null,
            author: a ? { name: a.name, username: a.username, image: a.image, verified: isVerifiedProfile(a) } : null,
            likes: p._count.likes, comments: p._count.comments,
            liked: likedIds.includes(p.id), saved: savedIds.includes(p.id),
            isMine: p.profileId === myId,
        };
    });

    return NextResponse.json({ posts: enriched, total, hasMore: offset + posts.length < total });
}

// POST /api/nexus/posts — yangi post
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const { text, media, marketProductId } = await req.json();
    const mediaArr: string[] = Array.isArray(media) ? media.filter((x: unknown) => typeof x === "string") : [];
    const clean = typeof text === "string" ? text.trim() : "";
    if (!clean && !mediaArr.length) return NextResponse.json({ error: "Post bo'sh bo'lmasin" }, { status: 400 });

    const attachId = typeof marketProductId === "string" && marketProductId ? marketProductId : null;
    const post = await prisma.nexusPost.create({
        data: {
            profileId: profile.id,
            text: clean || null,
            media: mediaArr,
            hashtags: extractHashtags(clean),
            marketProductId: attachId,
        },
    });

    const prodMap = await loadAttachedProducts([attachId]);

    return NextResponse.json({
        post: {
            id: post.id, text: post.text, media: post.media, hashtags: post.hashtags,
            marketProductId: post.marketProductId, shareCount: 0, createdAt: post.createdAt,
            product: attachId ? prodMap[attachId] ?? null : null,
            author: { name: profile.name, username: profile.username, image: profile.image, verified: isVerifiedProfile(profile) },
            likes: 0, comments: 0, liked: false, saved: false, isMine: true,
        },
    });
}
