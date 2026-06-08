import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/nexus/follows?username=X&type=followers|following&offset=&limit=
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const type = searchParams.get("type") === "following" ? "following" : "followers";
    const limit = Math.min(Number(searchParams.get("limit") ?? 30), 50);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    if (!username) return NextResponse.json({ users: [], hasMore: false });
    const target = await prisma.userProfile.findUnique({ where: { username }, select: { id: true } });
    if (!target) return NextResponse.json({ users: [], hasMore: false });

    // Sessiya egasi (mening follow holatim uchun)
    const session = await getServerSession(authOptions);
    let meId: string | null = null;
    if (session?.user?.email) {
        const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
    }

    // followers → target'ni kuzatuvchilar (followerId); following → target kuzatadiganlar (followingId)
    const where = type === "followers" ? { followingId: target.id } : { followerId: target.id };
    const rows = await prisma.nexusFollow.findMany({
        where, orderBy: { createdAt: "desc" }, take: limit + 1, skip: offset,
        select: { followerId: true, followingId: true },
    });
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);
    const userIds = slice.map(r => type === "followers" ? r.followerId : r.followingId);

    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, username: true, image: true, humoId: true },
    });
    const pMap = Object.fromEntries(profiles.map(p => [p.id, p]));

    // Men shu ro'yxatdagilardan kimni kuzataman
    let myFollowing = new Set<string>();
    if (meId && userIds.length) {
        const mine = await prisma.nexusFollow.findMany({
            where: { followerId: meId, followingId: { in: userIds } }, select: { followingId: true },
        });
        myFollowing = new Set(mine.map(m => m.followingId));
    }

    const users = userIds
        .map(id => {
            const p = pMap[id];
            if (!p) return null;
            return {
                name: p.name, username: p.username, image: p.image,
                verified: isVerifiedProfile(p),
                isFollowing: myFollowing.has(id),
                isMe: id === meId,
            };
        })
        .filter((u): u is NonNullable<typeof u> => u !== null);

    return NextResponse.json({ users, hasMore });
}
