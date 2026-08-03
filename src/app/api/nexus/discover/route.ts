import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { getHiddenAuthorIds } from "@/lib/nexus-block";

// GET /api/nexus/discover — trenddagi hashtaglar + tavsiya qilingan odamlar
export async function GET() {
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

    // 3-bosqich CF — avval "senga o'xshaganlar kuzatadigan" tavsiya mualliflar (score bo'yicha)
    if (meId) {
        const interest = await prisma.nexusInterest.findUnique({ where: { profileId: meId }, select: { recAuthors: true } });
        const rec = (interest?.recAuthors ?? {}) as unknown as Record<string, number>;
        const recIds = Object.entries(rec).sort((a, b) => b[1] - a[1]).map(([id]) => id);
        for (const id of recIds) {
            if (id === meId || myFollowing.has(id) || seen.has(id) || hidden.has(id)) continue;
            seen.add(id); candidateIds.push(id);
            if (candidateIds.length >= 8) break;
        }
    }

    // Qolganini so'nggi post mualliflari bilan to'ldiramiz (CF yetmasa / yangi user)
    for (const p of recentPosts) {
        if (candidateIds.length >= 8) break;
        if (p.profileId === meId || myFollowing.has(p.profileId) || seen.has(p.profileId) || hidden.has(p.profileId)) continue;
        seen.add(p.profileId); candidateIds.push(p.profileId);
    }
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: candidateIds }, username: { not: null }, accountType: "GOOGLE" },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    });
    const pMap = Object.fromEntries(profs.map(p => [p.id, p]));
    const suggestedUsers = candidateIds
        .map(id => pMap[id])
        .filter((u): u is NonNullable<typeof u> => !!u)
        .map(u => ({ name: u.name, username: u.username, image: u.image, verified: isVerifiedProfile(u), verifiedCategory: isVerifiedProfile(u) ? (u.verifiedCategory || null) : null, isFollowing: false, isMe: false }));

    return NextResponse.json({ trendingTags, suggestedUsers });
}
