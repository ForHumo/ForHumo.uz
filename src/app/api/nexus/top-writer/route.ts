// GET /api/nexus/top-writer?limit=50 — bu haftaning eng aktiv mualliflari (TOP 50)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// Server-side cache 10 daqiqa
const cacheMap = new Map<number, { at: number; data: unknown }>();
const TTL = 10 * 60 * 1000;

export async function GET(req: Request) {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit")) || 50));
    const cache = cacheMap.get(limit);
    if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);

    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    // So'nggi hafta postlaridan har mualliflar bo'yicha like va izoh yig'ish
    const rows = await prisma.nexusPost.findMany({
        where: { hidden: false, createdAt: { gte: since } },
        select: {
            profileId: true,
            _count: { select: { likes: true, comments: true } },
        },
        take: 500,
    });
    const score = new Map<string, { posts: number; likes: number; comments: number }>();
    for (const r of rows) {
        const s = score.get(r.profileId) ?? { posts: 0, likes: 0, comments: 0 };
        s.posts += 1;
        s.likes += r._count.likes;
        s.comments += r._count.comments;
        score.set(r.profileId, s);
    }
    if (score.size === 0) {
        const data = { writer: null, top: [] };
        cacheMap.set(limit, { at: Date.now(), data });
        return NextResponse.json(data);
    }
    const ranked = [...score.entries()]
        .map(([id, s]) => ({ id, ...s, total: s.likes * 2 + s.comments * 3 + s.posts }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

    const profs = await prisma.userProfile.findMany({
        where: { id: { in: ranked.map(r => r.id) } },
        select: { id: true, name: true, username: true, image: true, verified: true, verifiedCategory: true, humoId: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));

    const top = ranked
        .map(r => {
            const p = pMap[r.id];
            if (!p || !p.username) return null;
            return {
                name: p.name, username: p.username, image: p.image,
                verified: isVerifiedProfile(p),
                verifiedCategory: isVerifiedProfile(p) ? (p.verifiedCategory || null) : null,
                posts: r.posts, likes: r.likes, comments: r.comments, score: r.total,
            };
        })
        .filter((x): x is NonNullable<typeof x> => !!x);

    const data = { writer: top[0] ?? null, top };
    cacheMap.set(limit, { at: Date.now(), data });
    return NextResponse.json(data);
}
