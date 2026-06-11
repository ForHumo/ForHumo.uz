import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { moderateOnCreate } from "@/lib/moderation";

// POST /api/nexus/videos — yangi video
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json();
    const {
        title, description, videoUrl, thumbUrl, durationSec, category,
        orientation, width, height, tags, descImages, isMature, priceZij, prevVideoId,
    } = body;
    if (!videoUrl || typeof videoUrl !== "string") return NextResponse.json({ error: "Video kerak" }, { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });

    // Orientation: G.Video (gorizontal) / V.Video (vertikal). kind shundan kelib chiqadi.
    const orient: "HORIZONTAL" | "VERTICAL" = orientation === "VERTICAL" ? "VERTICAL" : "HORIZONTAL";

    // Teglar: # ni olib tashlash, bo'sh emas, takror emas (cheksiz)
    const cleanTags = Array.isArray(tags)
        ? [...new Set(tags.map((t: unknown) => String(t).replace(/^#+/, "").trim()).filter(Boolean).map((t: string) => t.slice(0, 50)))].slice(0, 50)
        : [];

    // Tavsifdagi dalil rasmlari (URL massiv)
    const cleanDescImages = Array.isArray(descImages)
        ? descImages.filter((u: unknown) => typeof u === "string" && u).map((u: string) => u).slice(0, 30)
        : [];

    // Narx (Ƶ) — 0 = bepul
    const price = Number.isFinite(priceZij) ? Math.max(0, Math.min(10_000_000, Math.round(Number(priceZij)))) : 0;

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
            thumbUrl: typeof thumbUrl === "string" && thumbUrl ? thumbUrl : null,
            durationSec: Number.isFinite(durationSec) ? Math.max(0, Math.round(Number(durationSec))) : 0,
            kind: orient === "VERTICAL" ? "SHORT" : "LONG",
            orientation: orient,
            width: Number.isFinite(width) ? Math.round(Number(width)) : null,
            height: Number.isFinite(height) ? Math.round(Number(height)) : null,
            category: typeof category === "string" && category ? category : null,
            tags: cleanTags,
            descImages: cleanDescImages,
            isMature: isMature === true,
            priceZij: price,
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

// GET /api/nexus/videos — ro'yxat (kind/sort/q/category/scope/author)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind") === "SHORT" ? "SHORT" : "LONG";
    const sort = searchParams.get("sort") === "trend" ? "trend" : "new";
    const q = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || "";
    const scope = searchParams.get("scope") || "all";
    const author = searchParams.get("author") || "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 24), 40);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    const where: Prisma.NexusVideoWhereInput = { hidden: false, kind };
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

    const videos = await prisma.nexusVideo.findMany({
        where,
        orderBy: sort === "trend" ? [{ views: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
        take: limit, skip: offset,
        include: { _count: { select: { likes: true, comments: true } } },
    });

    const authorIds = [...new Set(videos.map(v => v.profileId))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const out = videos.map(v => {
        const p = pMap[v.profileId];
        return {
            id: v.id, title: v.title, thumbUrl: v.thumbUrl, videoUrl: v.videoUrl,
            durationSec: v.durationSec, kind: v.kind, views: v.views, createdAt: v.createdAt,
            likeCount: v._count.likes, commentCount: v._count.comments,
            author: p ? { name: p.name, username: p.username, image: p.image, verified: isVerifiedProfile(p) } : null,
        };
    });

    return NextResponse.json({ videos: out });
}
