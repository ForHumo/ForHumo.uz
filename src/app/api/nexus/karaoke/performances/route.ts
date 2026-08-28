// GET  /api/nexus/karaoke/performances?trackId=&scope=trending|new|mine&limit=&offset=
// POST /api/nexus/karaoke/performances — { trackId, audioUrl, durationSec, score, caption?, duetOfId? }
import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidMediaUrl } from "@/lib/media-url";
import { isVerifiedProfile } from "@/lib/nexus";
import { nexusRateLimited, RATE_MSG } from "@/lib/nexus-rate";
import { banGuard } from "@/lib/moderation-guard";
import { moderateOnCreate } from "@/lib/moderation";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId") || undefined;
    const scope = searchParams.get("scope") || "trending";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 24), 1), 60);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    const where: Prisma.NexusKaraokePerformanceWhereInput = { hidden: false };
    if (trackId) where.trackId = trackId;
    if (scope === "mine" && meId) where.profileId = meId;

    const orderBy: Prisma.NexusKaraokePerformanceOrderByWithRelationInput = scope === "new"
        ? { createdAt: "desc" }
        : scope === "mine"
            ? { createdAt: "desc" }
            : { score: "desc" };

    const rows = await prisma.nexusKaraokePerformance.findMany({
        where,
        orderBy: [orderBy, { createdAt: "desc" }],
        take: limit, skip: offset,
        include: { _count: { select: { likes: true } } },
    });

    // Author profillar + treklar
    const authorIds = [...new Set(rows.map(r => r.profileId))];
    const trackIds = [...new Set(rows.map(r => r.trackId))];
    const [profs, tracks] = await Promise.all([
        prisma.userProfile.findMany({
            where: { id: { in: authorIds } },
            select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
        }),
        prisma.nexusTrack.findMany({
            where: { id: { in: trackIds } },
            select: { id: true, title: true, artist: true, coverUrl: true },
        }),
    ]);
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    const tMap = Object.fromEntries(tracks.map(t => [t.id, t]));

    let likedSet = new Set<string>();
    if (meId && rows.length) {
        const likes = await prisma.nexusKaraokePerformanceLike.findMany({
            where: { profileId: meId, performanceId: { in: rows.map(r => r.id) } },
            select: { performanceId: true },
        });
        likedSet = new Set(likes.map(l => l.performanceId));
    }

    const performances = rows.map(r => {
        const p = pMap[r.profileId];
        const t = tMap[r.trackId];
        return {
            id: r.id, audioUrl: r.audioUrl, durationSec: r.durationSec, score: r.score,
            caption: r.caption, plays: r.plays, createdAt: r.createdAt,
            likeCount: r._count.likes, isLiked: likedSet.has(r.id),
            isMine: r.profileId === meId,
            duetOfId: r.duetOfId,
            performer: p ? {
                name: p.name, username: p.username, image: p.image,
                verified: isVerifiedProfile(p),
                verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
            } : null,
            track: t ? { id: t.id, title: t.title, artist: t.artist, coverUrl: t.coverUrl } : null,
        };
    });

    return NextResponse.json({ performances, hasMore: rows.length === limit });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true, humoId: true, username: true } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });
    if (!profile.humoId || !profile.username) return NextResponse.json({ error: "Humo ID kerak" }, { status: 403 });
    const banned = await banGuard(profile.id); if (banned) return banned;
    if (await nexusRateLimited(profile.id, "track")) return NextResponse.json({ error: RATE_MSG }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const trackId = String(body?.trackId ?? "");
    const audioUrl = String(body?.audioUrl ?? "");
    if (!trackId || !isValidMediaUrl(audioUrl)) return NextResponse.json({ error: "trackId va audioUrl kerak" }, { status: 400 });

    const track = await prisma.nexusTrack.findUnique({
        where: { id: trackId }, select: { id: true, hidden: true, title: true },
    });
    if (!track || track.hidden) return NextResponse.json({ error: "Trek topilmadi" }, { status: 404 });

    const durationSec = Math.max(0, Math.min(3600, Math.round(Number(body?.durationSec) || 0)));
    const score = Math.max(0, Math.min(100, Math.round(Number(body?.score) || 0)));
    const caption = typeof body?.caption === "string" && body.caption.trim() ? body.caption.trim().slice(0, 300) : null;

    // Duet — ixtiyoriy
    let duetOfId: string | null = null;
    if (typeof body?.duetOfId === "string" && body.duetOfId) {
        const parent = await prisma.nexusKaraokePerformance.findFirst({
            where: { id: body.duetOfId, hidden: false }, select: { id: true },
        });
        duetOfId = parent?.id ?? null;
    }

    const perf = await prisma.nexusKaraokePerformance.create({
        data: { trackId, profileId: profile.id, audioUrl, durationSec, score, caption, duetOfId },
    });

    // Pre-publish moderatsiya (audio matn yo'q lekin caption mavjud bo'lsa)
    after(() => moderateOnCreate({
        module: "NEXUS", targetType: "TRACK", targetId: perf.id,
        text: caption ?? track.title, imageUrl: null, kind: "karaoke performance",
        authorId: profile.id,
    }));

    return NextResponse.json({ ok: true, performance: { id: perf.id, score, durationSec } });
}
