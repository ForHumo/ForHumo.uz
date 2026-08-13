// Kanal xabarlari moderatsiyasi (owner/admin uchun).
//   GET /api/nexus/channels/[id]/moderation
//     — PENDING holatidagi kanal xabarlari flag'lari + kontent snippetlari

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // Faqat owner/admin
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        return NextResponse.json({ error: "Faqat egasi yoki admin" }, { status: 403 });
    }

    // Shu kanalning barcha xabar ID'lari (moderatsiya PENDING bo'lganlarni topish uchun)
    const chMsgs = await prisma.nexusChannelMessage.findMany({
        where: { channelId: id }, select: { id: true }, take: 5000,
    });
    const ids = chMsgs.map(m => m.id);
    if (ids.length === 0) return NextResponse.json({ flags: [], total: 0 });

    const flags = await prisma.moderationFlag.findMany({
        where: {
            module: "NEXUS",
            targetType: "CHANNEL_MESSAGE",
            targetId: { in: ids },
            status: "PENDING",
        },
        orderBy: { updatedAt: "desc" }, take: 50,
    });
    if (flags.length === 0) return NextResponse.json({ flags: [], total: 0 });

    // Xabar snippetlarini biriktirish
    const msgs = await prisma.nexusChannelMessage.findMany({
        where: { id: { in: flags.map(f => f.targetId) } },
        select: { id: true, text: true, senderId: true, createdAt: true, hidden: true },
    });
    const mMap = new Map(msgs.map(m => [m.id, m]));
    const senderIds = [...new Set(msgs.map(m => m.senderId))];
    const senders = await prisma.userProfile.findMany({
        where: { id: { in: senderIds } }, select: { id: true, name: true, username: true, image: true },
    });
    const sMap = new Map(senders.map(s => [s.id, s]));

    return NextResponse.json({
        total: flags.length,
        flags: flags.map(f => {
            const m = mMap.get(f.targetId);
            const s = m ? sMap.get(m.senderId) : null;
            return {
                id: f.id,
                messageId: f.targetId,
                reportCount: f.reportCount,
                lastReason: f.lastReason,
                aiVerdict: f.aiVerdict,
                aiSeverity: f.aiSeverity,
                aiReason: f.aiReason,
                createdAt: f.createdAt,
                message: m ? {
                    text: m.text, createdAt: m.createdAt, hidden: m.hidden,
                    sender: s ? { name: s.name, username: s.username, image: s.image } : null,
                } : null,
            };
        }),
    });
}
