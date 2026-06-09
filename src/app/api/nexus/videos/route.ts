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

    const { title, description, videoUrl, thumbUrl, durationSec, kind, category } = await req.json();
    if (!videoUrl || typeof videoUrl !== "string") return NextResponse.json({ error: "Video kerak" }, { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });

    const video = await prisma.nexusVideo.create({
        data: {
            profileId: profile.id,
            title: String(title).trim().slice(0, 200),
            description: typeof description === "string" && description.trim() ? description.trim().slice(0, 2000) : null,
            videoUrl,
            thumbUrl: typeof thumbUrl === "string" && thumbUrl ? thumbUrl : null,
            durationSec: Number.isFinite(durationSec) ? Math.max(0, Math.round(Number(durationSec))) : 0,
            kind: kind === "SHORT" ? "SHORT" : "LONG",
            category: typeof category === "string" && category ? category : null,
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
