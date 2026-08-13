// Mening barcha bookmark qilingan xabarlarim (barcha suhbatlardan).
//   GET /api/nexus/bookmarks

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ bookmarks: [] });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ bookmarks: [] });

    const rows = await prisma.nexusMessageBookmark.findMany({
        where: { profileId: me.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
            message: {
                select: {
                    id: true, text: true, senderId: true, createdAt: true,
                    mediaType: true, mediaUrl: true, conversationId: true,
                    conversation: { select: { user1Id: true, user2Id: true } },
                },
            },
        },
    });

    // Suhbat egalari ma'lumotini olish (peer nomi)
    const peerIds = new Set<string>();
    for (const r of rows) {
        const c = r.message.conversation;
        const otherId = c.user1Id === me.id ? c.user2Id : c.user1Id;
        peerIds.add(otherId);
    }
    const peers = await prisma.userProfile.findMany({
        where: { id: { in: [...peerIds] } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(peers.map(p => [p.id, p]));

    return NextResponse.json({
        bookmarks: rows.map(r => {
            const c = r.message.conversation;
            const oid = c.user1Id === me.id ? c.user2Id : c.user1Id;
            const p = pMap.get(oid);
            return {
                id: r.id,
                messageId: r.message.id,
                conversationId: r.message.conversationId,
                note: r.note,
                createdAt: r.createdAt,
                message: {
                    text: r.message.text,
                    mine: r.message.senderId === me.id,
                    createdAt: r.message.createdAt,
                    mediaType: r.message.mediaType,
                    mediaUrl: r.message.mediaUrl,
                },
                peer: p ? { name: p.name, username: p.username, image: p.image } : null,
            };
        }),
    });
}
