// GET /api/nexus/top-writer — bu haftaning eng aktiv muallifi (like+comment yig'indisi)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// Server-side cache 10 daqiqa (kunlik hisob-kitob kifoya)
let cache: { at: number; data: unknown } | null = null;
const TTL = 10 * 60 * 1000;

export async function GET() {
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
        const data = { writer: null };
        cache = { at: Date.now(), data };
        return NextResponse.json(data);
    }
    const ranked = [...score.entries()]
        .map(([id, s]) => ({ id, ...s, total: s.likes * 2 + s.comments * 3 + s.posts }))
        .sort((a, b) => b.total - a.total);
    const top = ranked[0];
    const prof = await prisma.userProfile.findUnique({
        where: { id: top.id },
        select: { name: true, username: true, image: true, verified: true, verifiedCategory: true, humoId: true },
    });
    if (!prof || !prof.username) {
        const data = { writer: null };
        cache = { at: Date.now(), data };
        return NextResponse.json(data);
    }
    const data = {
        writer: {
            name: prof.name, username: prof.username, image: prof.image,
            verified: isVerifiedProfile(prof),
            verifiedCategory: isVerifiedProfile(prof) ? (prof.verifiedCategory || null) : null,
            posts: top.posts, likes: top.likes, comments: top.comments,
        },
    };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
}
