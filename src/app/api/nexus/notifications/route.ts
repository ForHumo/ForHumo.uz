import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";

// GET /api/nexus/notifications — bildirishnomalar ro'yxati + o'qilmagan soni
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ notifications: [], unreadCount: 0 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ notifications: [], unreadCount: 0 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 30), 50);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const [rows, unreadCount] = await prisma.$transaction([
        prisma.nexusNotification.findMany({ where: { recipientId: me.id }, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
        prisma.nexusNotification.count({ where: { recipientId: me.id, read: false } }),
    ]);

    const actorIds = [...new Set(rows.map(r => r.actorId))];
    const postIds = [...new Set(rows.map(r => r.postId).filter((x): x is string => !!x))];
    const [actors, posts] = await Promise.all([
        prisma.userProfile.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, username: true, image: true, humoId: true } }),
        postIds.length ? prisma.nexusPost.findMany({ where: { id: { in: postIds } }, select: { id: true, text: true } }) : Promise.resolve([] as { id: string; text: string | null }[]),
    ]);
    const aMap = Object.fromEntries(actors.map(a => [a.id, a]));
    const postMap = Object.fromEntries(posts.map(p => [p.id, p.text]));

    const notifications = rows.map(n => {
        const a = aMap[n.actorId];
        return {
            id: n.id, type: n.type, read: n.read, createdAt: n.createdAt,
            actor: a ? { name: a.name, username: a.username, image: a.image, verified: isVerifiedProfile(a) } : null,
            postText: n.postId ? (postMap[n.postId] ?? null) : null,
        };
    });

    return NextResponse.json({ notifications, unreadCount });
}
