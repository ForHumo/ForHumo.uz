import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { getHiddenAuthorIds } from "@/lib/nexus-block";

function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }

// GET /api/nexus/search?q=X — foydalanuvchi / post / hashtag / video / audio / jonli qidirish
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const rawQ = (searchParams.get("q") || "").trim();
    // Prefiks tozalash: "@sevara" → "sevara", "#tag" → "tag" (username/hashtag DB'da @/# yo'q)
    const q = rawQ.replace(/^[@#]+/, "").trim();
    if (!q) return NextResponse.json({ users: [], posts: [], tags: [], videos: [], tracks: [], lives: [] });

    // Sessiya egasi (isFollowing uchun)
    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    // Bloklangan/mute mualliflar — qidiruvdan ham chiqarib tashlanadi
    const hidden = await getHiddenAuthorIds(meId);
    const notHidden = hidden.length ? { profileId: { notIn: hidden } } : {};

    // ── Foydalanuvchilar ──
    const userRows = await prisma.userProfile.findMany({
        where: {
            accountType: "GOOGLE", // SWEET (hamkor) profillar For Humo ijtimoiy yuzasida ko'rinmaydi
            username: { not: null },
            ...(hidden.length ? { id: { notIn: hidden } } : {}),
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
            ],
        },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
        take: 8,
    });
    let myFollowing = new Set<string>();
    if (meId && userRows.length) {
        const mine = await prisma.nexusFollow.findMany({
            where: { followerId: meId, followingId: { in: userRows.map(u => u.id) } }, select: { followingId: true },
        });
        myFollowing = new Set(mine.map(m => m.followingId));
    }
    const users = userRows.map(u => ({
        name: u.name, username: u.username, image: u.image,
        verified: isVerifiedProfile(u), verifiedCategory: isVerifiedProfile(u) ? (u.verifiedCategory || null) : null, isFollowing: myFollowing.has(u.id), isMe: u.id === meId,
    }));

    // ── Postlar ──
    const postRows = await prisma.nexusPost.findMany({
        where: { hidden: false, ...notHidden, text: { contains: q, mode: "insensitive" } },
        orderBy: { createdAt: "desc" }, take: 8,
        include: { _count: { select: { likes: true, comments: true } } },
    });
    const authorIds = [...new Set(postRows.map(p => p.profileId))];
    const authors = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const aMap = Object.fromEntries(authors.map(a => [a.id, a]));
    const posts = postRows.map(p => {
        const a = aMap[p.profileId];
        return {
            id: p.id, text: p.text, createdAt: p.createdAt,
            likes: p._count.likes, comments: p._count.comments,
            author: a ? { name: a.name, username: a.username, image: a.image, verified: isVerifiedProfile(a), verifiedCategory: isVerifiedProfile(a) ? (a.verifiedCategory || null) : null } : null,
        };
    });

    // ── Hashtaglar (so'nggi postlardan, substring) ──
    const recent = await prisma.nexusPost.findMany({
        where: { hidden: false, hashtags: { isEmpty: false } },
        select: { hashtags: true }, orderBy: { createdAt: "desc" }, take: 300,
    });
    const counts = new Map<string, number>();
    for (const r of recent) for (const t of r.hashtags) counts.set(t, (counts.get(t) || 0) + 1);
    const ql = q.toLowerCase().replace(/^#/, "");
    const tags = [...counts.entries()]
        .filter(([t]) => t.toLowerCase().includes(ql))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count }));

    // ── Videolar / Audio / Jonli (parallel) ──
    const [vidRows, trackRows, liveRows] = await Promise.all([
        prisma.nexusVideo.findMany({
            where: { hidden: false, isMature: false, ...notHidden, title: { contains: q, mode: "insensitive" } },
            orderBy: [{ views: "desc" }, { createdAt: "desc" }], take: 6,
            select: { id: true, title: true, thumbUrl: true, durationSec: true, orientation: true, views: true, price: true, profileId: true },
        }),
        prisma.nexusTrack.findMany({
            where: { hidden: false, ...notHidden, OR: [{ title: { contains: q, mode: "insensitive" } }, { artist: { contains: q, mode: "insensitive" } }] },
            orderBy: [{ plays: "desc" }, { createdAt: "desc" }], take: 6,
            select: { id: true, title: true, artist: true, coverUrl: true, audioUrl: true, durationSec: true, kind: true, plays: true, profileId: true },
        }),
        prisma.nexusLiveStream.findMany({
            where: { hidden: false, privacy: "PUBLIC", status: { in: ["LIVE", "UPCOMING"] }, ...notHidden, title: { contains: q, mode: "insensitive" } },
            orderBy: { createdAt: "desc" }, take: 5,
            select: { id: true, title: true, status: true, profileId: true },
        }),
    ]);

    // Media mualliflari
    const mediaAuthorIds = [...new Set([...vidRows, ...trackRows, ...liveRows].map(r => r.profileId))];
    const mediaAuthors = mediaAuthorIds.length
        ? await prisma.userProfile.findMany({ where: { id: { in: mediaAuthorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true } })
        : [];
    const mMap = Object.fromEntries(mediaAuthors.map(a => [a.id, a]));
    const authorOf = (pid: string) => {
        const a = mMap[pid];
        return a ? { name: a.name, username: a.username, image: a.image, verified: isVerifiedProfile(a), verifiedCategory: isVerifiedProfile(a) ? (a.verifiedCategory || null) : null } : null;
    };

    const videos = vidRows.map(v => ({
        id: v.id, title: v.title, thumbUrl: v.thumbUrl, duration: fmtDur(v.durationSec),
        orientation: v.orientation, views: v.views, price: v.price, author: authorOf(v.profileId),
    }));
    const tracks = trackRows.map(t => ({
        id: t.id, title: t.title, artist: t.artist, coverUrl: t.coverUrl, audioUrl: t.audioUrl,
        duration: fmtDur(t.durationSec), durationSec: t.durationSec, kind: t.kind, plays: t.plays, author: authorOf(t.profileId),
    }));
    const lives = liveRows.map(s => ({
        id: s.id, title: s.title, status: s.status, author: authorOf(s.profileId),
    }));

    return NextResponse.json({ users, posts, tags, videos, tracks, lives });
}
