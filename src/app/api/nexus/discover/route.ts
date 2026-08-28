import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { getHiddenAuthorIds } from "@/lib/nexus-block";

// GET /api/nexus/discover?offset=0&rich=1 — trenddagi hashtaglar + tavsiya odamlar + (rich) video/track/live/post
export async function GET(req: Request) {
    const url = new URL(req.url);
    const offset = Math.max(0, Math.min(200, Number(url.searchParams.get("offset")) || 0));
    const rich = url.searchParams.get("rich") === "1";
    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    // ── Trenddagi hashtaglar (so'nggi 300 post) ──
    const recent = await prisma.nexusPost.findMany({
        where: { hidden: false, hashtags: { isEmpty: false } },
        select: { hashtags: true }, orderBy: { createdAt: "desc" }, take: 300,
    });
    const counts = new Map<string, number>();
    for (const r of recent) for (const t of r.hashtags) counts.set(t, (counts.get(t) || 0) + 1);
    const trendingTags = [...counts.entries()]
        .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));

    // ── Tavsiya qilingan odamlar — so'nggi post mualliflari, men emas, kuzatmaganlarim ──
    const myFollowing = meId
        ? new Set((await prisma.nexusFollow.findMany({ where: { followerId: meId }, select: { followingId: true } })).map(f => f.followingId))
        : new Set<string>();
    const recentPosts = await prisma.nexusPost.findMany({
        where: { hidden: false }, select: { profileId: true }, orderBy: { createdAt: "desc" }, take: 100,
    });
    const hidden = new Set(await getHiddenAuthorIds(meId));
    const seen = new Set<string>();
    const candidateIds: string[] = [];

    const wantCount = 8 + offset;

    // 3-bosqich CF — avval "senga o'xshaganlar kuzatadigan" tavsiya mualliflar (score bo'yicha)
    if (meId) {
        const interest = await prisma.nexusInterest.findUnique({ where: { profileId: meId }, select: { recAuthors: true } });
        const rec = (interest?.recAuthors ?? {}) as unknown as Record<string, number>;
        const recIds = Object.entries(rec).sort((a, b) => b[1] - a[1]).map(([id]) => id);
        for (const id of recIds) {
            if (id === meId || myFollowing.has(id) || seen.has(id) || hidden.has(id)) continue;
            seen.add(id); candidateIds.push(id);
            if (candidateIds.length >= wantCount) break;
        }
    }

    // Qolganini so'nggi post mualliflari bilan to'ldiramiz (CF yetmasa / yangi user)
    for (const p of recentPosts) {
        if (candidateIds.length >= wantCount) break;
        if (p.profileId === meId || myFollowing.has(p.profileId) || seen.has(p.profileId) || hidden.has(p.profileId)) continue;
        seen.add(p.profileId); candidateIds.push(p.profileId);
    }
    const slicedCandidateIds = candidateIds.slice(offset, offset + 8);
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: slicedCandidateIds }, username: { not: null }, accountType: "GOOGLE" },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    const suggestedUsers = slicedCandidateIds
        .map(id => pMap[id])
        .filter((u): u is NonNullable<typeof u> => !!u)
        .map(u => ({ name: u.name, username: u.username, image: u.image, verified: isVerifiedProfile(u), verifiedCategory: isVerifiedProfile(u) ? (u.verifiedCategory || null) : null, isFollowing: false, isMe: false }));
    const hasMoreUsers = candidateIds.length > offset + 8;

    if (!rich) {
        return NextResponse.json({ trendingTags, suggestedUsers, hasMoreUsers });
    }

    // ── Rich mode: trending video/audio/live + kunning top postlari ──
    const [videos, tracks, lives, topPostsRaw] = await Promise.all([
        prisma.nexusVideo.findMany({
            where: { hidden: false, isMature: false },
            orderBy: { createdAt: "desc" }, take: 6,
            select: { id: true, title: true, thumbUrl: true, orientation: true, durationSec: true, views: true, price: true },
        }),
        prisma.nexusTrack.findMany({
            where: { hidden: false, kind: "MUSIC" },
            orderBy: { plays: "desc" }, take: 6,
            select: { id: true, title: true, artist: true, coverUrl: true, plays: true },
        }),
        prisma.nexusLiveStream.findMany({
            where: { status: "LIVE" },
            orderBy: { peakViewers: "desc" }, take: 4,
            select: { id: true, title: true, peakViewers: true, profileId: true },
        }),
        prisma.nexusPost.findMany({
            where: { hidden: false, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
            orderBy: [{ createdAt: "desc" }],
            take: 30,
            select: {
                id: true, text: true, media: true, createdAt: true, profileId: true,
                _count: { select: { likes: true, comments: true } },
            },
        }),
    ]);

    // Author profillarini ikkalasi uchun bir marta yig'amiz
    const authorIds = new Set<string>();
    for (const l of lives) authorIds.add(l.profileId);
    for (const p of topPostsRaw) authorIds.add(p.profileId);
    const authorList = authorIds.size ? await prisma.userProfile.findMany({
        where: { id: { in: [...authorIds] } },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    }) : [];
    const aMap = Object.fromEntries(authorList.map(a => [a.id, a]));
    function authorOut(id: string) {
        const a = aMap[id];
        if (!a) return null;
        return { name: a.name, username: a.username, image: a.image,
            verified: isVerifiedProfile(a),
            verifiedCategory: isVerifiedProfile(a) ? (a.verifiedCategory || null) : null };
    }
    const topPosts = topPostsRaw
        .map(p => ({
            id: p.id, text: p.text, media: p.media,
            likes: p._count.likes, comments: p._count.comments,
            score: p._count.likes * 2 + p._count.comments * 3,
            author: authorOut(p.profileId),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

    return NextResponse.json({
        trendingTags, suggestedUsers, hasMoreUsers,
        videos, tracks,
        lives: lives.map(l => ({ id: l.id, title: l.title, viewers: l.peakViewers, author: authorOut(l.profileId) })),
        topPosts,
    });
}
