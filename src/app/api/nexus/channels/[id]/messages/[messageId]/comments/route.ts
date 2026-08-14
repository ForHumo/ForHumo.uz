// Kanal xabari izohlari (Telegram uslub).
//
//   GET /api/nexus/channels/[id]/messages/[messageId]/comments?limit=50
//   → { comments: [...] } — replyToId=messageId bo'lgan barcha xabarlar, xronologik

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVerifiedProfile } from "@/lib/nexus";
import { getBlockedIds } from "@/lib/nexus-block";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const { id, messageId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const channel = await prisma.nexusChannel.findUnique({
        where: { id }, select: { isPrivate: true, allowComments: true, type: true, hidden: true },
    });
    if (!channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    if (channel.isPrivate) {
        const member = await prisma.nexusChannelMember.findUnique({
            where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
        });
        if (!member) return NextResponse.json({ error: "Yopiq" }, { status: 403 });
    }

    // Top-level xabar shu kanalga tegishli ekanini tekshirish
    const parent = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { channelId: true, replyToId: true },
    });
    if (!parent || parent.channelId !== id) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    if (parent.replyToId) return NextResponse.json({ error: "Bu izoh — top-level xabar emas" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));

    // Blok: bloklangan foydalanuvchilar izohlari ko'rinmasin
    const blockedIds = await getBlockedIds(me.id);
    const comments = await prisma.nexusChannelMessage.findMany({
        where: {
            channelId: id, replyToId: messageId, hidden: false,
            ...(blockedIds.size > 0 ? { senderId: { notIn: [...blockedIds] } } : {}),
        },
        orderBy: { createdAt: "asc" },
        take: limit,
    });
    const senderIds = [...new Set(comments.map(c => c.senderId))];
    const senders = senderIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true, username: true, image: true, humoId: true, verified: true, verifiedCategory: true },
    }) : [];
    const sMap = new Map(senders.map(s => [s.id, s]));

    return NextResponse.json({
        comments: comments.map(c => {
            const s = sMap.get(c.senderId);
            return {
                id: c.id,
                text: c.text,
                media: c.media,
                createdAt: c.createdAt,
                editedAt: c.editedAt,
                mine: c.senderId === me.id,
                author: s ? {
                    name: s.name, username: s.username, image: s.image,
                    verified: isVerifiedProfile(s),
                } : null,
            };
        }),
    });
}
