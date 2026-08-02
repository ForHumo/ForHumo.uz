import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile, isAdultBirthday } from "@/lib/nexus";
import { moderateOnCreate } from "@/lib/moderation";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { currencyForCountry } from "@/lib/money";
import { getHiddenAuthorIds } from "@/lib/nexus-block";
import { isValidMediaUrl, filterMediaUrls } from "@/lib/media-url";

// POST /api/nexus/videos — yangi video
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, humoId: true, username: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!profile.humoId || !profile.username) return NextResponse.json({ error: "Humo ID kerak" }, { status: 403 });
    if (await nexusRateLimited(profile.id, "video")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const body = await req.json();
    const {
        title, description, videoUrl, thumbUrl, durationSec, category,
        orientation, width, height, tags, descImages, isMature, price, prevVideoId,
    } = body;
    if (!isValidMediaUrl(videoUrl)) return NextResponse.json({ error: "Video kerak" }, { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });

    // Orientation: G.Video (gorizontal) / V.Video (vertikal). kind shundan kelib chiqadi.
    const orient: "HORIZONTAL" | "VERTICAL" = orientation === "VERTICAL" ? "VERTICAL" : "HORIZONTAL";

    // Teglar: # ni olib tashlash, bo'sh emas, takror emas (cheksiz)
    const cleanTags = Array.isArray(tags)
        ? [...new Set(tags.map((t: unknown) => String(t).replace(/^#+/, "").trim()).filter(Boolean).map((t: string) => t.slice(0, 50)))].slice(0, 50)
        : [];

    // Tavsifdagi dalil rasmlari (URL massiv) — faqat yaroqli https URL
    const cleanDescImages = filterMediaUrls(descImages, 30);

    // Narx (foydalanuvchi valyutasida) — 0 = bepul
    const priceNum = Number.isFinite(price) ? Math.max(0, Math.min(10_000_000, Math.round(Number(price)))) : 0;

    // Series — avvalgi qism faqat o'zimning mavjud videom bo'lishi mumkin
    let prevId: string | null = null;
    if (typeof prevVideoId === "string" && prevVideoId) {
        const prev = await prisma.nexusVideo.findFirst({ where: { id: prevVideoId, profileId: profile.id }, select: { id: true } });
        prevId = prev?.id ?? null;
    }

    const video = await prisma.nexusVideo.create({
        data: {
            profileId: profile.id,
            title: String(title).trim().slice(0, 300),
            // Tavsif cheksiz (xavfsizlik uchun 100k belgi shifti)
            description: typeof description === "string" && description.trim() ? description.trim().slice(0, 100_000) : null,
            videoUrl,
            thumbUrl: isValidMediaUrl(thumbUrl) ? thumbUrl : null,
            durationSec: Number.isFinite(durationSec) ? Math.max(0, Math.round(Number(durationSec))) : 0,
            kind: orient === "VERTICAL" ? "SHORT" : "LONG",
            orientation: orient,
            width: Number.isFinite(width) ? Math.round(Number(width)) : null,
            height: Number.isFinite(height) ? Math.round(Number(height)) : null,
            category: typeof category === "string" && category ? category : null,
            tags: cleanTags,
            descImages: cleanDescImages,
            isMature: isMature === true,
            price: priceNum,
            prevVideoId: prevId,
        },
    });

    // Pre-publish moderatsiya (sarlavha+tavsif matn + thumbnail)
    after(() => moderateOnCreate({
        module: "NEXUS", targetType: "VIDEO", targetId: video.id,
        text: `${video.title}\n${video.description || ""}`, imageUrl: video.thumbUrl, kind: "video",
    }));

    return NextResponse.json({ video });
}

// GET /api/nexus/videos — ro'yxat (kind/orientation/free/sort/q/category/scope/author)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const kindParam = searchParams.get("kind");
    const orientParam = searchParams.get("orientation");
    const sort = searchParams.get("sort") === "trend" ? "trend" : "new";
    const q = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || "";
    const scope = searchParams.get("scope") || "all";
    const author = searchParams.get("author") || "";
    const free = searchParams.get("free") === "1";
    const limit = Math.min(Number(searchParams.get("limit") ?? 24), 60);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    let adult = false;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, birthday: true } });
        meId = me?.id ?? null;
        adult = isAdultBirthday(me?.birthday);
    }

    const where: Prisma.NexusVideoWhereInput = { hidden: false };
    if (kindParam === "SHORT" || kindParam === "LONG") where.kind = kindParam;
    if (orientParam === "HORIZONTAL" || orientParam === "VERTICAL") where.orientation = orientParam;
    if (free) where.price = 0;
    if (category) where.category = category;
    if (q) where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
    ];
    if (author) {
        const a = await prisma.userProfile.findUnique({ where: { username: author }, select: { id: true } });
        where.profileId = a?.id ?? "__none__";
    } else if (scope === "following" && meId) {
        const follows = await prisma.nexusFollow.findMany({ where: { followerId: meId }, select: { followingId: true } });
        where.profileId = { in: follows.map(f => f.followingId) };
    } else if (scope === "mine" && meId) {
        where.profileId = meId;
    }
    // 18+ — faqat tasdiqlangan kattalar ko'radi (o'z videolari bundan mustasno)
    if (!adult && !(scope === "mine" && meId)) where.isMature = false;

    // Bloklangan/mute mualliflarni chiqarib tashlash
    const hiddenIds = (await getHiddenAuthorIds(meId)).filter(x => x !== meId);
    if (hiddenIds.length) where.AND = [{ profileId: { notIn: hiddenIds } }];

    const videos = await prisma.nexusVideo.findMany({
        where,
        orderBy: sort === "trend" ? [{ views: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
        take: limit, skip: offset,
        include: { _count: { select: { likes: true, comments: true } } },
    });

    const authorIds = [...new Set(videos.map(v => v.profileId))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, country: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    // "Keyinroq ko'rish" + xarid holati
    let savedIds = new Set<string>();
    let boughtIds = new Set<string>();
    if (meId && videos.length) {
        const ids = videos.map(v => v.id);
        const [wl, pu] = await Promise.all([
            prisma.nexusWatchLater.findMany({ where: { profileId: meId, videoId: { in: ids } }, select: { videoId: true } }),
            prisma.nexusVideoPurchase.findMany({ where: { buyerId: meId, videoId: { in: ids } }, select: { videoId: true } }),
        ]);
        savedIds = new Set(wl.map(w => w.videoId));
        boughtIds = new Set(pu.map(p => p.videoId));
    }

    const out = videos.map(v => {
        const p = pMap[v.profileId];
        // Pullik video — sotib olinmaguncha videoUrl chiqmaydi (paywall bypass'ini yopadi)
        const locked = v.price > 0 && v.profileId !== meId && !boughtIds.has(v.id);
        return {
            id: v.id, title: v.title, thumbUrl: v.thumbUrl, videoUrl: locked ? "" : v.videoUrl,
            durationSec: v.durationSec, kind: v.kind, orientation: v.orientation,
            price: v.price, priceCurrency: currencyForCountry(p?.country), isMature: v.isMature, isSaved: savedIds.has(v.id), locked,
            views: v.views, createdAt: v.createdAt,
            likeCount: v._count.likes, commentCount: v._count.comments,
            author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
        };
    });

    return NextResponse.json({ videos: out });
}
