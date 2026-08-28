import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isVerifiedProfile, extractHashtags } from "@/lib/nexus";
import { after } from "next/server";
import { moderateOnCreate } from "@/lib/moderation";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { banGuard } from "@/lib/moderation-guard";
import { getHiddenAuthorIds } from "@/lib/nexus-block";
import { getActiveSubscribedCreatorIds } from "@/lib/nexus-sub";
import { notifyMentions } from "@/lib/nexus-mention";
import { filterMediaUrls } from "@/lib/media-url";
import { currencyForCountry } from "@/lib/money";
import { buildInterestProfile, scorePost } from "@/lib/nexus-rank";
import { embedPost, semanticPostScores } from "@/lib/nexus-embed";
import { grantAchievement } from "@/lib/achievements";

async function myProfileId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const p = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    return p?.id ?? null;
}

// GET /api/nexus/posts?tab=explore|following&offset=&limit=
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "explore";
    const scope = searchParams.get("scope") ?? "";              // saved = mening saqlanganlarim
    const tag = searchParams.get("tag") ?? undefined;          // hashtag bo'yicha filtr
    const author = searchParams.get("author") ?? undefined;     // username bo'yicha profil posti
    const limit = Math.min(Number(searchParams.get("limit") ?? 15), 30);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const myId = await myProfileId();

    // Kuzatayotganlarim — following tab va FOLLOWERS maxfiyligi uchun
    let followingIds: string[] = [];
    if (myId) {
        const follows = await prisma.nexusFollow.findMany({ where: { followerId: myId }, select: { followingId: true } });
        followingIds = follows.map(f => f.followingId);
    }

    const where: Prisma.NexusPostWhereInput = { hidden: false };
    if (scope === "saved") {
        if (!myId) return NextResponse.json({ posts: [], total: 0, hasMore: false });
        where.saves = { some: { profileId: myId } };
    }
    if (tag) where.hashtags = { has: tag };
    if (author) {
        const a = await prisma.userProfile.findUnique({ where: { username: author }, select: { id: true } });
        where.profileId = a?.id ?? "__none__";
    } else if (tab === "following" && myId) {
        where.profileId = { in: [...followingIds, myId] };
    }

    // Maxfiylik: PUBLIC hammaga; FOLLOWERS — kuzatsam; SUBSCRIBERS — faol obunachi bo'lsam; PRIVATE/o'zimniki — faqat o'zim
    const privacyOr: Prisma.NexusPostWhereInput[] = [{ privacy: "PUBLIC" }];
    if (myId) {
        privacyOr.push({ profileId: myId });
        if (followingIds.length) privacyOr.push({ privacy: "FOLLOWERS", profileId: { in: followingIds } });
        const subbedCreatorIds = await getActiveSubscribedCreatorIds(myId);
        if (subbedCreatorIds.length) privacyOr.push({ privacy: "SUBSCRIBERS", profileId: { in: subbedCreatorIds } });
    }
    where.AND = [{ OR: privacyOr }];

    // Bloklangan/mute qilingan mualliflarni tasmadan chiqarib tashlash (o'zimni emas)
    const hiddenIds = (await getHiddenAuthorIds(myId)).filter(id => id !== myId);
    if (hiddenIds.length) (where.AND as Prisma.NexusPostWhereInput[]).push({ profileId: { notIn: hiddenIds } });

    // "Senga mos" (foryou) — nomzodlar to'plamini olib, shaxsiy reyting bilan tartiblaymiz.
    // Boshqa tablar (explore/following/tag/author/saved) — xronologik (DB pagination).
    type PostRow = Prisma.NexusPostGetPayload<{ include: { _count: { select: { likes: true; comments: true } } } }>;
    const POST_INCLUDE = { _count: { select: { likes: true, comments: true } } } as const;
    let posts: PostRow[];
    let total: number;
    if (tab === "foryou" && myId) {
        const POOL = 250;
        const [recentPool, profile, semScores] = await Promise.all([
            prisma.nexusPost.findMany({ where, orderBy: { createdAt: "desc" }, take: POOL, include: POST_INCLUDE }),
            buildInterestProfile(myId),
            semanticPostScores(myId, 120),   // 4-bosqich: semantik o'xshashlik
        ]);
        // Semantik nomzodlar — recency pool'da yo'qlarini ham qo'shamiz (eski, lekin mavzuga mos).
        // Maxfiylik/blok filtri SHU YERDA ham `where` orqali — pgvural natijasi to'g'ridan-to'g'ri ko'rsatilmaydi.
        const haveIds = new Set(recentPool.map(p => p.id));
        const extraIds = [...semScores.keys()].filter(id => !haveIds.has(id));
        const extra = extraIds.length
            ? await prisma.nexusPost.findMany({ where: { AND: [where, { id: { in: extraIds } }] }, include: POST_INCLUDE })
            : [];
        const pool = [...recentPool, ...extra];
        const now = Date.now();
        const scored = pool
            .map(p => ({ p, s: scorePost(p, profile, now) + 1.2 * (semScores.get(p.id) ?? 0) }))
            .sort((a, b) => b.s - a.s);
        total = scored.length;
        posts = scored.slice(offset, offset + limit).map(x => x.p);
    } else {
        [posts, total] = await prisma.$transaction([
            prisma.nexusPost.findMany({
                where, orderBy: { createdAt: "desc" }, take: limit, skip: offset,
                include: POST_INCLUDE,
            }),
            prisma.nexusPost.count({ where }),
        ]);
    }

    const profileIds = [...new Set(posts.map(p => p.profileId))];
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
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

    // So'rovnoma natijalari + mening ovozim
    const pollIds = posts.filter(p => p.pollOptions.length > 0).map(p => p.id);
    const voteCounts: Record<string, Record<number, number>> = {};
    const myVotes: Record<string, number> = {};
    if (pollIds.length) {
        const grouped = await prisma.nexusPollVote.groupBy({
            by: ["postId", "optionIdx"], where: { postId: { in: pollIds } }, _count: { _all: true },
        });
        for (const g of grouped) {
            (voteCounts[g.postId] ??= {})[g.optionIdx] = g._count._all;
        }
        if (myId) {
            const mine = await prisma.nexusPollVote.findMany({ where: { profileId: myId, postId: { in: pollIds } } });
            for (const v of mine) myVotes[v.postId] = v.optionIdx;
        }
    }

    // Pullik postlar uchun paywall — xarid qilinganmi tekshiramiz
    const paidIds = posts.filter(p => p.price > 0 && p.profileId !== myId).map(p => p.id);
    let purchasedSet = new Set<string>();
    if (myId && paidIds.length) {
        const rows = await prisma.nexusPostPurchase.findMany({
            where: { buyerId: myId, postId: { in: paidIds } }, select: { postId: true },
        });
        purchasedSet = new Set(rows.map(r => r.postId));
    }
    // Subscription (subsFree) — men avtorga pullik obunachimi
    let subscribedAuthorSet = new Set<string>();
    if (myId) {
        const subs = await getActiveSubscribedCreatorIds(myId);
        subscribedAuthorSet = new Set(subs);
    }

    const enriched = posts.map(p => {
        const a = pMap[p.profileId];
        const isMine = p.profileId === myId;
        const paid = p.price > 0;
        const bought = purchasedSet.has(p.id);
        const subFree = p.subsFree && subscribedAuthorSet.has(p.profileId);
        const locked = paid && !isMine && !bought && !subFree;
        return {
            id: p.id,
            text: locked ? null : p.text,
            media: locked ? [] : p.media,
            hashtags: p.hashtags,
            shareCount: p.shareCount, createdAt: p.createdAt, editedAt: p.editedAt,
            privacy: p.privacy, location: p.location, locationLat: p.locationLat, locationLng: p.locationLng,
            price: p.price, priceCurrency: p.priceCurrency, subsFree: p.subsFree, locked,
            pollOptions: locked ? [] : p.pollOptions, pollEndsAt: p.pollEndsAt,
            pollVotes: !locked && p.pollOptions.length ? p.pollOptions.map((_, i) => voteCounts[p.id]?.[i] ?? 0) : [],
            myVote: p.id in myVotes ? myVotes[p.id] : null,
            author: a ? { name: a.name, username: a.username, image: a.image, verified: isVerifiedProfile(a), verifiedCategory: isVerifiedProfile(a) ? (a.verifiedCategory || null) : null } : null,
            likes: p._count.likes, comments: p._count.comments,
            liked: likedIds.includes(p.id), saved: savedIds.includes(p.id),
            isMine,
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
    if (!profile.humoId || !profile.username) return NextResponse.json({ error: "Humo ID kerak" }, { status: 403 });
    const banned = await banGuard(profile.id); if (banned) return banned;
    if (await nexusRateLimited(profile.id, "post")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { text, media, privacy, location, locationLat, locationLng, pollOptions, pollDurationHours, price, subsFree } = await req.json();
    const mediaArr: string[] = filterMediaUrls(media, 10);
    const clean = typeof text === "string" ? text.trim().slice(0, 5000) : "";

    // So'rovnoma: 2-4 bo'sh bo'lmagan variant
    const cleanPoll: string[] = Array.isArray(pollOptions)
        ? pollOptions.map((o: unknown) => String(o).trim()).filter(Boolean).slice(0, 4)
        : [];
    const hasPoll = cleanPoll.length >= 2;
    if (hasPoll && !clean) return NextResponse.json({ error: "So'rovnoma savoli kerak" }, { status: 400 });
    if (!clean && !mediaArr.length) return NextResponse.json({ error: "Post bo'sh bo'lmasin" }, { status: 400 });

    const hours = [24, 72, 168].includes(Number(pollDurationHours)) ? Number(pollDurationHours) : 24;
    // SUBSCRIBERS — faqat pullik obunasi yoqilgan ijodkorlar tanlay oladi
    const priv =
        privacy === "FOLLOWERS" ? "FOLLOWERS"
        : privacy === "PRIVATE" ? "PRIVATE"
        : privacy === "SUBSCRIBERS" && profile.subPrice > 0 ? "SUBSCRIBERS"
        : "PUBLIC";

    const post = await prisma.nexusPost.create({
        data: {
            profileId: profile.id,
            text: clean || null,
            media: mediaArr,
            hashtags: extractHashtags(clean),
            privacy: priv,
            location: typeof location === "string" && location.trim() ? location.trim().slice(0, 200) : null,
            locationLat: typeof locationLat === "number" && Number.isFinite(locationLat) ? locationLat : null,
            locationLng: typeof locationLng === "number" && Number.isFinite(locationLng) ? locationLng : null,
            price: Number.isFinite(Number(price)) && Number(price) > 0 ? Math.min(Math.floor(Number(price)), 100_000_000) : 0,
            priceCurrency: currencyForCountry(profile.country),
            subsFree: subsFree === true,
            pollOptions: hasPoll ? cleanPoll : [],
            pollEndsAt: hasPoll ? new Date(Date.now() + hours * 3600_000) : null,
        },
    });

    // Pre-publish moderatsiya (javob yuborilgach — jiddiy bo'lsa avto-yashiradi)
    after(() => moderateOnCreate({
        module: "NEXUS", targetType: "POST", targetId: post.id,
        text: post.text, imageUrl: mediaArr[0] || null, kind: "post",
        authorId: profile.id,
    }));
    // @mention bildirishnomalari
    after(() => notifyMentions({ text: post.text, actorId: profile.id, postId: post.id }));
    // Semantik embedding (4-bosqich tavsiya) — javobni kechiktirmaydi
    after(() => embedPost(post.id, post.text ?? "", post.hashtags));
    // Yutuq (birinchi post)
    after(() => { grantAchievement(profile.id, "nexus.first_post"); });

    return NextResponse.json({
        post: {
            id: post.id, text: post.text, media: post.media, hashtags: post.hashtags,
            shareCount: 0, createdAt: post.createdAt,
            privacy: post.privacy, location: post.location, locationLat: post.locationLat, locationLng: post.locationLng,
            price: post.price, priceCurrency: post.priceCurrency, subsFree: post.subsFree, locked: false,
            pollOptions: post.pollOptions, pollEndsAt: post.pollEndsAt,
            pollVotes: post.pollOptions.map(() => 0), myVote: null,
            author: { name: profile.name, username: profile.username, image: profile.image, verified: isVerifiedProfile(profile), verifiedCategory: isVerifiedProfile(profile) ? (profile.verifiedCategory || null) : null },
            likes: 0, comments: 0, liked: false, saved: false, isMine: true,
        },
    });
}
