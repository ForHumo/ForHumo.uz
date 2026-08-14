// Agent statistika — faqat egasi (owner).
// Nechta DM qabul qildi, nechta javob berdi, unique users, kunlik trend.
//
//   GET /api/nexus/agents/[id]/stats

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface DailyRow { date: string; received: bigint; sent: bigint }

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const agent = await prisma.nexusAgent.findUnique({
        where: { id },
        select: {
            id: true, ownerId: true, profileId: true,
            webhookUrl: true, apiKey: true, createdAt: true,
            profile: { select: { name: true, username: true, image: true } },
        },
    });
    if (!agent) return NextResponse.json({ error: "Agent topilmadi" }, { status: 404 });
    if (agent.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi" }, { status: 403 });

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    // Agent DM'lari — barcha suhbatlar (agent user1Id yoki user2Id)
    const convs = await prisma.nexusConversation.findMany({
        where: { OR: [{ user1Id: agent.profileId }, { user2Id: agent.profileId }] },
        select: { id: true, user1Id: true, user2Id: true },
    });
    const convIds = convs.map(c => c.id);
    const uniqueUsers = new Set<string>();
    for (const c of convs) uniqueUsers.add(c.user1Id === agent.profileId ? c.user2Id : c.user1Id);

    // Agent qabul qilgan xabarlar (senderId != agent) va javoblar (senderId = agent)
    const [received24h, sent24h, received7d, sent7d, received30d, sent30d, receivedTotal, sentTotal, distinctSenders7d] = await Promise.all([
        prisma.nexusMessage.count({ where: { conversationId: { in: convIds }, senderId: { not: agent.profileId }, createdAt: { gte: dayAgo } } }),
        prisma.nexusMessage.count({ where: { conversationId: { in: convIds }, senderId: agent.profileId, createdAt: { gte: dayAgo } } }),
        prisma.nexusMessage.count({ where: { conversationId: { in: convIds }, senderId: { not: agent.profileId }, createdAt: { gte: weekAgo } } }),
        prisma.nexusMessage.count({ where: { conversationId: { in: convIds }, senderId: agent.profileId, createdAt: { gte: weekAgo } } }),
        prisma.nexusMessage.count({ where: { conversationId: { in: convIds }, senderId: { not: agent.profileId }, createdAt: { gte: monthAgo } } }),
        prisma.nexusMessage.count({ where: { conversationId: { in: convIds }, senderId: agent.profileId, createdAt: { gte: monthAgo } } }),
        prisma.nexusMessage.count({ where: { conversationId: { in: convIds }, senderId: { not: agent.profileId } } }),
        prisma.nexusMessage.count({ where: { conversationId: { in: convIds }, senderId: agent.profileId } }),
        // 7 kunda unique yozgan foydalanuvchilar — distinct senderId
        convIds.length > 0
            ? prisma.nexusMessage.findMany({
                where: {
                    conversationId: { in: convIds },
                    senderId: { not: agent.profileId },
                    createdAt: { gte: weekAgo },
                },
                distinct: ["senderId"],
                select: { senderId: true },
            })
            : Promise.resolve([]),
    ]);
    const activeUsers7d = distinctSenders7d.length;

    // 30 kunlik chart: kunlik received + sent
    // convIds bo'sh bo'lsa raw SQL'ga IN () yozib bo'lmaydi — bo'sh massiv bilan bo'sh natija
    let daily: DailyRow[] = [];
    if (convIds.length > 0) {
        daily = await prisma.$queryRaw<DailyRow[]>`
            SELECT
                to_char(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(r.cnt, 0)::bigint AS received,
                COALESCE(s.cnt, 0)::bigint AS sent
            FROM generate_series(
                (NOW() - INTERVAL '29 days')::date,
                NOW()::date,
                INTERVAL '1 day'
            ) AS d(day)
            LEFT JOIN (
                SELECT DATE_TRUNC('day', "createdAt")::date AS day, COUNT(*) AS cnt
                FROM "NexusMessage"
                WHERE "conversationId" = ANY(${convIds})
                  AND "senderId" != ${agent.profileId}
                  AND "createdAt" >= NOW() - INTERVAL '30 days'
                GROUP BY 1
            ) r ON r.day = d.day
            LEFT JOIN (
                SELECT DATE_TRUNC('day', "createdAt")::date AS day, COUNT(*) AS cnt
                FROM "NexusMessage"
                WHERE "conversationId" = ANY(${convIds})
                  AND "senderId" = ${agent.profileId}
                  AND "createdAt" >= NOW() - INTERVAL '30 days'
                GROUP BY 1
            ) s ON s.day = d.day
            ORDER BY date ASC
        `;
    }

    // Response rate: sent / received (0..1)
    const responseRate30d = received30d > 0 ? Math.min(1, sent30d / received30d) : 0;

    return NextResponse.json({
        agent: {
            id: agent.id, profileId: agent.profileId,
            name: agent.profile.name, username: agent.profile.username, image: agent.profile.image,
            webhookConfigured: !!agent.webhookUrl && !!agent.apiKey,
            createdAt: agent.createdAt,
        },
        totals: { received: receivedTotal, sent: sentTotal, uniqueUsers: uniqueUsers.size, activeUsers7d },
        received: { today: received24h, week: received7d, month: received30d, total: receivedTotal },
        sent:     { today: sent24h,     week: sent7d,     month: sent30d,     total: sentTotal },
        responseRate30d,     // 0..1
        messagesByDay: daily.map(r => ({ date: r.date, received: Number(r.received), sent: Number(r.sent) })),
        generatedAt: now.toISOString(),
    });
}
