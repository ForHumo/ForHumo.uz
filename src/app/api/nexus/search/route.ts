import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/nexus/search?q=X — foydalanuvchi / post / hashtag qidirish
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ users: [], posts: [], tags: [] });

    // Sessiya egasi (isFollowing uchun)
    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    // ── Foydalanuvchilar ──
    const userRows = await prisma.userProfile.findMany({
        where: {
            accountType: "GOOGLE", // SWEET (hamkor) profillar For Humo ijtimoiy yuzasida ko'rinmaydi
            username: { not: null },
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
            ],
        },
        select: { id: true, name: true, username: true, image: true, humoId: true },
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
        verified: isVerifiedProfile(u), isFollowing: myFollowing.has(u.id), isMe: u.id === meId,
    }));

    // ── Postlar ──
    const postRows = await prisma.nexusPost.findMany({
        where: { hidden: false, text: { contains: q, mode: "insensitive" } },
        orderBy: { createdAt: "desc" }, take: 8,
        include: { _count: { select: { likes: true, comments: true } } },
    });
    const authorIds = [...new Set(postRows.map(p => p.profileId))];
    const authors = await prisma.userProfile.findMany({
        where: { id: { in: authorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true },
    });
    const aMap = Object.fromEntries(authors.map(a => [a.id, a]));
    const posts = postRows.map(p => {
        const a = aMap[p.profileId];
        return {
            id: p.id, text: p.text, createdAt: p.createdAt,
            likes: p._count.likes, comments: p._count.comments,
            author: a ? { name: a.name, username: a.username, image: a.image, verified: isVerifiedProfile(a) } : null,
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

    return NextResponse.json({ users, posts, tags });
}
