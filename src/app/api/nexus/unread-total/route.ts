// Nexus global unread badge — DM + kanal + guruh + bildirishnoma jami.
// Header ikonasida yagona raqam ko'rsatiladi ("Nexus'da 24 yangi").
//
//   GET /api/nexus/unread-total
//   → { dm, channel, group, notif, total }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ dm: 0, channel: 0, group: 0, notif: 0, total: 0 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ dm: 0, channel: 0, group: 0, notif: 0, total: 0 });

    // DM — suhbat darajasidagi unread (o'qilmagan suhbatlar soni)
    const dmConvs = await prisma.nexusConversation.findMany({
        where: { OR: [{ user1Id: me.id }, { user2Id: me.id }] },
        select: {
            user1Id: true, user2Id: true, user1ReadAt: true, user2ReadAt: true,
            lastMessageAt: true, lastSenderId: true,
        },
    });
    let dmUnread = 0;
    for (const c of dmConvs) {
        if (!c.lastMessageAt || c.lastSenderId === me.id) continue;
        const myReadAt = c.user1Id === me.id ? c.user1ReadAt : c.user2ReadAt;
        if (!myReadAt || myReadAt < c.lastMessageAt) dmUnread++;
    }

    // Kanal + guruh — lastReadAt vs channel.lastMessageAt (channel.updatedAt fallback)
    const memberships = await prisma.nexusChannelMember.findMany({
        where: { profileId: me.id, channel: { hidden: false } },
        include: {
            channel: {
                select: {
                    type: true,
                    // Kanal xabarining eng oxirgi vaqti (subquery emas — messages relation'dan)
                    messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, senderId: true } },
                },
            },
        },
    });
    let channelUnread = 0, groupUnread = 0;
    for (const m of memberships) {
        const lastMsg = m.channel.messages[0];
        if (!lastMsg || lastMsg.senderId === me.id) continue;
        if (m.lastReadAt && m.lastReadAt >= lastMsg.createdAt) continue;
        if (m.channel.type === "CHANNEL") channelUnread++;
        else if (m.channel.type === "GROUP") groupUnread++;
    }

    // Bildirishnoma
    const notif = await prisma.nexusNotification.count({
        where: { recipientId: me.id, read: false },
    });

    const total = dmUnread + channelUnread + groupUnread + notif;
    return NextResponse.json({
        dm: dmUnread, channel: channelUnread, group: groupUnread, notif, total,
    });
}
