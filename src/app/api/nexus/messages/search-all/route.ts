// Global DM message search — barcha suhbatlar bo'yicha.
//
//   GET /api/nexus/messages/search-all?q=text&limit=30
//   Response: {
//     total: number,
//     items: Array<{
//       messageId, conversationId, text, createdAt, mine,
//       peer: { name, username, image }
//     }>
//   }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ items: [], total: 0 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ items: [], total: 0 });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "30")));
    if (q.length < 2) return NextResponse.json({ items: [], total: 0 });

    // Barcha suhbatlarim (id + peer)
    const convs = await prisma.nexusConversation.findMany({
        where: { OR: [{ user1Id: me.id }, { user2Id: me.id }] },
        select: { id: true, user1Id: true, user2Id: true },
    });
    const convIds = convs.map(c => c.id);
    if (convIds.length === 0) return NextResponse.json({ items: [], total: 0 });

    const now = new Date();
    const total = await prisma.nexusMessage.count({
        where: {
            conversationId: { in: convIds },
            text: { contains: q, mode: "insensitive" },
            deletedForEveryoneAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
    });

    const rows = await prisma.nexusMessage.findMany({
        where: {
            conversationId: { in: convIds },
            text: { contains: q, mode: "insensitive" },
            deletedForEveryoneAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, conversationId: true, text: true, createdAt: true, senderId: true },
    });
    if (rows.length === 0) return NextResponse.json({ items: [], total });

    // Peer profiles
    const convMap = new Map(convs.map(c => [c.id, c]));
    const peerIds = new Set<string>();
    for (const r of rows) {
        const c = convMap.get(r.conversationId);
        if (!c) continue;
        const isSelf = c.user1Id === me.id && c.user2Id === me.id;
        if (isSelf) continue;
        peerIds.add(c.user1Id === me.id ? c.user2Id : c.user1Id);
    }
    const profs = await prisma.userProfile.findMany({
        where: { id: { in: [...peerIds] } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profs.map(p => [p.id, p]));

    const items = rows.map(r => {
        const c = convMap.get(r.conversationId)!;
        const isSelf = c.user1Id === me.id && c.user2Id === me.id;
        const peerId = isSelf ? me.id : (c.user1Id === me.id ? c.user2Id : c.user1Id);
        const p = pMap.get(peerId);
        return {
            messageId: r.id,
            conversationId: r.conversationId,
            text: r.text,
            createdAt: r.createdAt.toISOString(),
            mine: r.senderId === me.id,
            isSelf,
            peer: isSelf
                ? { id: me.id, name: "Saqlangan xabarlar", username: null, image: null }
                : p ? { id: p.id, name: p.name, username: p.username, image: p.image }
                    : null,
        };
    });

    return NextResponse.json({ items, total });
}
