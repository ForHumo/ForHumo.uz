import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { moderateOnCreate } from "@/lib/moderation";
import { getHiddenAuthorIds } from "@/lib/nexus-block";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { banGuard } from "@/lib/moderation-guard";
import { isValidMediaUrl } from "@/lib/media-url";

// POST /api/nexus/tracks — yangi trek (musiqa/podkast/audiokitob)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, humoId: true, username: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!profile.humoId || !profile.username) return NextResponse.json({ error: "Humo ID kerak" }, { status: 403 });
    const banned = await banGuard(profile.id); if (banned) return banned;
    if (await nexusRateLimited(profile.id, "track")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const { title, artist, audioUrl, coverUrl, durationSec, kind, genre } = await req.json();
    if (!isValidMediaUrl(audioUrl)) return NextResponse.json({ error: "Audio kerak" }, { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });

    const track = await prisma.nexusTrack.create({
        data: {
            profileId: profile.id,
            title: String(title).trim().slice(0, 200),
            artist: typeof artist === "string" && artist.trim() ? artist.trim().slice(0, 120) : null,
            audioUrl,
            coverUrl: isValidMediaUrl(coverUrl) ? coverUrl : null,
            durationSec: Number.isFinite(durationSec) ? Math.max(0, Math.round(Number(durationSec))) : 0,
            kind: kind === "PODCAST" ? "PODCAST" : kind === "AUDIOBOOK" ? "AUDIOBOOK" : "MUSIC",
            genre: typeof genre === "string" && genre ? genre : null,
        },
    });

    // Pre-publish moderatsiya (sarlavha+ijrochi matni + muqova)
    after(() => moderateOnCreate({
        module: "NEXUS", targetType: "TRACK", targetId: track.id,
        text: `${track.title}\n${track.artist || ""}`, imageUrl: track.coverUrl, kind: "post",
    }));

    return NextResponse.json({ track });
}

// GET /api/nexus/tracks — ro'yxat (kind/sort/q/scope=mine|liked)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const kindParam = (searchParams.get("kind") || "MUSIC").toUpperCase();
    const kind = ["MUSIC", "PODCAST", "AUDIOBOOK"].includes(kindParam) ? kindParam as "MUSIC" | "PODCAST" | "AUDIOBOOK" : "MUSIC";
    const sort = searchParams.get("sort") === "top" ? "top" : "new";
    const q = (searchParams.get("q") || "").trim();
    const scope = searchParams.get("scope") || "all";
    const author = searchParams.get("author") || "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 24), 60);

    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    // Muallif berilsa — uning barcha audio turlari (kind cheklanmaydi); aks holda bitta kind tab.
    const where: Prisma.NexusTrackWhereInput = { hidden: false };
    if (!author) where.kind = kind;
    if (q) where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { artist: { contains: q, mode: "insensitive" } },
    ];
    if (author) {
        const a = await prisma.userProfile.findUnique({ where: { username: author }, select: { id: true } });
        where.profileId = a?.id ?? "__none__";
    } else if (scope === "mine" && meId) where.profileId = meId;
    else if (scope === "liked" && meId) where.likes = { some: { profileId: meId } };

    // Bloklangan/mute mualliflarni chiqarib tashlash
    const hiddenIds = (await getHiddenAuthorIds(meId)).filter(x => x !== meId);
    if (hiddenIds.length) where.AND = [{ profileId: { notIn: hiddenIds } }];

    const tracks = await prisma.nexusTrack.findMany({
        where,
        orderBy: sort === "top" ? [{ plays: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
        take: limit,
        include: { _count: { select: { likes: true } } },
    });

    const authorIds = [...new Set(tracks.map(t => t.profileId))];
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    let likedIds = new Set<string>();
    if (meId && tracks.length) {
        const likes = await prisma.nexusTrackLike.findMany({
            where: { profileId: meId, trackId: { in: tracks.map(t => t.id) } }, select: { trackId: true },
        });
        likedIds = new Set(likes.map(l => l.trackId));
    }

    return NextResponse.json({
        tracks: tracks.map(t => {
            const p = pMap[t.profileId];
            return {
                id: t.id, title: t.title, artist: t.artist, audioUrl: t.audioUrl, coverUrl: t.coverUrl,
                durationSec: t.durationSec, kind: t.kind, genre: t.genre, plays: t.plays,
                likeCount: t._count.likes, isLiked: likedIds.has(t.id),
                isMine: t.profileId === meId, createdAt: t.createdAt,
                uploader: p ? { name: p.name, username: p.username, verified: isVerifiedProfile(p) } : null,
            };
        }),
    });
}
