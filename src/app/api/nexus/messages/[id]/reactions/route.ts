// Xabar reaksiyalari uchun foydalanuvchilar ro'yxati.
//   GET /api/nexus/messages/[convId]/reactions?messageId=X&emoji=Y

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");
    const emoji = url.searchParams.get("emoji");
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // Xabarni tekshirish — foydalanuvchi shu suhbat ishtirokchisi bo'lishi kerak
    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId }, select: { conversationId: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const conv = await prisma.nexusConversation.findUnique({
        where: { id }, select: { user1Id: true, user2Id: true },
    });
    if (!conv || (conv.user1Id !== me.id && conv.user2Id !== me.id)) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const rows = await prisma.nexusMessageReaction.findMany({
        where: { messageId, ...(emoji ? { emoji } : {}) },
        orderBy: { createdAt: "asc" },
        select: { emoji: true, createdAt: true, profileId: true },
    });
    const profileIds = [...new Set(rows.map(r => r.profileId))];
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));

    return NextResponse.json({
        users: rows.map(r => {
            const p = pMap.get(r.profileId);
            return {
                emoji: r.emoji,
                createdAt: r.createdAt,
                name: p?.name ?? null,
                username: p?.username ?? null,
                image: p?.image ?? null,
                mine: r.profileId === me.id,
            };
        }),
    });
}
