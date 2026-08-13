// Suhbat statistikasi (analitika).
//   GET /api/nexus/messages/[convId]/stats

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

    const conv = await prisma.nexusConversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    // Barcha xabarlar (self-destruct/scheduled hisobga olinmaydi)
    const now = new Date();
    const where = {
        conversationId: id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [{ OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }] }],
    };

    const [total, mineCount, mediaGroups, reactionCount] = await Promise.all([
        prisma.nexusMessage.count({ where }),
        prisma.nexusMessage.count({ where: { ...where, senderId: me.id } }),
        prisma.nexusMessage.groupBy({
            by: ["mediaType"],
            where: { ...where, mediaType: { not: null } },
            _count: true,
        }),
        prisma.nexusMessageReaction.count({
            where: { message: { conversationId: id } },
        }),
    ]);

    // Media hisoblari (image/video/audio/file/video-circle/poll/location)
    const mediaCounts: Record<string, number> = {};
    for (const g of mediaGroups) {
        if (g.mediaType) mediaCounts[g.mediaType] = g._count;
    }

    // Boshlagan sana → hozirgacha kunlar (o'rtacha kunlik xabar)
    const firstMsg = await prisma.nexusMessage.findFirst({
        where: { conversationId: id }, orderBy: { createdAt: "asc" },
        select: { createdAt: true },
    });
    const days = firstMsg
        ? Math.max(1, Math.ceil((Date.now() - firstMsg.createdAt.getTime()) / (24 * 60 * 60 * 1000)))
        : 1;

    // Eng ko'p yozgan kun (oxirgi 30 kunlik oynada)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = await prisma.nexusMessage.findMany({
        where: { conversationId: id, createdAt: { gt: monthAgo } },
        select: { createdAt: true }, take: 5000,
    });
    const dayCounts = new Map<string, number>();
    for (const r of recent) {
        const key = r.createdAt.toISOString().slice(0, 10);
        dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
    let topDay: { date: string; count: number } | null = null;
    for (const [date, count] of dayCounts) {
        if (!topDay || count > topDay.count) topDay = { date, count };
    }

    return NextResponse.json({
        total,
        mineCount,
        peerCount: total - mineCount,
        mediaCounts,
        reactionCount,
        firstDate: firstMsg?.createdAt ?? null,
        days,
        avgPerDay: Math.round((total / days) * 10) / 10,
        topDay,
    });
}
