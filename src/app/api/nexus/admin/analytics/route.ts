// Nexus admin analytics — foydalanish statistikasi (faqat founder uchun).
//   GET /api/nexus/admin/analytics
// Xronologik chart: raw SQL `generate_series` + LEFT JOIN — bo'sh kunlar 0.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";

type DailyRow = { date: string; dm: bigint; channel: bigint };

export async function GET() {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "Faqat founder" }, { status: 403 });

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const [
        dmTotal, dmToday, dmWeek, dmMonth,
        chanTotal, chanToday, chanWeek, chanMonth,
        activeChannels, activeGroups,
        activeUsers7d, activeUsers30d, newSignups7d,
        pendingFlags, hiddenChanMsg7d,
        rawTopSenders, rawTopChannels, dailyRows,
    ] = await Promise.all([
        prisma.nexusMessage.count(),
        prisma.nexusMessage.count({ where: { createdAt: { gte: dayAgo } } }),
        prisma.nexusMessage.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.nexusMessage.count({ where: { createdAt: { gte: monthAgo } } }),

        prisma.nexusChannelMessage.count(),
        prisma.nexusChannelMessage.count({ where: { createdAt: { gte: dayAgo } } }),
        prisma.nexusChannelMessage.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.nexusChannelMessage.count({ where: { createdAt: { gte: monthAgo } } }),

        prisma.nexusChannel.count({ where: { type: "CHANNEL", hidden: false } }),
        prisma.nexusChannel.count({ where: { type: "GROUP", hidden: false } }),

        // Faol foydalanuvchilar (DM yoki kanal xabar yozgan) — 7d
        prisma.$queryRaw<Array<{ n: bigint }>>`
            SELECT COUNT(DISTINCT s)::bigint AS n FROM (
                SELECT "senderId" AS s FROM "NexusMessage" WHERE "createdAt" >= ${weekAgo}
                UNION
                SELECT "senderId" AS s FROM "NexusChannelMessage" WHERE "createdAt" >= ${weekAgo}
            ) u
        `.then(r => Number(r[0]?.n ?? 0)).catch(() => 0),
        // 30d
        prisma.$queryRaw<Array<{ n: bigint }>>`
            SELECT COUNT(DISTINCT s)::bigint AS n FROM (
                SELECT "senderId" AS s FROM "NexusMessage" WHERE "createdAt" >= ${monthAgo}
                UNION
                SELECT "senderId" AS s FROM "NexusChannelMessage" WHERE "createdAt" >= ${monthAgo}
            ) u
        `.then(r => Number(r[0]?.n ?? 0)).catch(() => 0),
        prisma.userProfile.count({ where: { createdAt: { gte: weekAgo } } }),

        prisma.moderationFlag.count({
            where: { module: "NEXUS", status: "PENDING" },
        }),
        prisma.nexusChannelMessage.count({
            where: { hidden: true, createdAt: { gte: weekAgo } },
        }),

        // Top 10 senders (DM+kanal, 7 kun) — raw SQL agregatsiya
        prisma.$queryRaw<Array<{ senderId: string; total: bigint }>>`
            SELECT "senderId", COUNT(*)::bigint AS total FROM (
                SELECT "senderId" FROM "NexusMessage" WHERE "createdAt" >= ${weekAgo}
                UNION ALL
                SELECT "senderId" FROM "NexusChannelMessage" WHERE "createdAt" >= ${weekAgo}
            ) u
            GROUP BY "senderId"
            ORDER BY total DESC
            LIMIT 10
        `,

        // Top 10 kanallar (7 kun)
        prisma.$queryRaw<Array<{ channelId: string; total: bigint }>>`
            SELECT "channelId", COUNT(*)::bigint AS total
            FROM "NexusChannelMessage"
            WHERE "createdAt" >= ${weekAgo}
            GROUP BY "channelId"
            ORDER BY total DESC
            LIMIT 10
        `,

        // 30 kunlik xronologik chart (DM + kanal xabarlari)
        prisma.$queryRaw<DailyRow[]>`
            SELECT
                to_char(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(dm.cnt, 0)::bigint AS dm,
                COALESCE(ch.cnt, 0)::bigint AS channel
            FROM generate_series(
                (NOW() - INTERVAL '29 days')::date,
                NOW()::date,
                INTERVAL '1 day'
            ) AS d(day)
            LEFT JOIN (
                SELECT DATE_TRUNC('day', "createdAt")::date AS day, COUNT(*) AS cnt
                FROM "NexusMessage"
                WHERE "createdAt" >= NOW() - INTERVAL '30 days'
                GROUP BY 1
            ) dm ON dm.day = d.day
            LEFT JOIN (
                SELECT DATE_TRUNC('day', "createdAt")::date AS day, COUNT(*) AS cnt
                FROM "NexusChannelMessage"
                WHERE "createdAt" >= NOW() - INTERVAL '30 days'
                GROUP BY 1
            ) ch ON ch.day = d.day
            ORDER BY date ASC
        `,
    ]);

    // Top senderlar profillarini biriktirish
    const senderIds = rawTopSenders.map(r => r.senderId);
    const senderProfiles = senderIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const sMap = new Map(senderProfiles.map(p => [p.id, p]));

    // Top kanallar ma'lumotini biriktirish
    const chanIds = rawTopChannels.map(r => r.channelId);
    const chanRows = chanIds.length ? await prisma.nexusChannel.findMany({
        where: { id: { in: chanIds } },
        select: { id: true, name: true, handle: true, avatarUrl: true, memberCount: true, type: true },
    }) : [];
    const cMap = new Map(chanRows.map(c => [c.id, c]));

    return NextResponse.json({
        generatedAt: now.toISOString(),
        dm: { total: dmTotal, today: dmToday, week: dmWeek, month: dmMonth },
        channel: {
            total: chanTotal, today: chanToday, week: chanWeek, month: chanMonth,
            activeChannels, activeGroups,
        },
        users: { active7d: activeUsers7d, active30d: activeUsers30d, newSignups7d },
        moderation: {
            pendingFlags,
            hiddenChanMsg7d,
        },
        topSenders7d: rawTopSenders.map(r => {
            const p = sMap.get(r.senderId);
            return {
                profileId: r.senderId,
                name: p?.name ?? null,
                username: p?.username ?? null,
                image: p?.image ?? null,
                count: Number(r.total),
            };
        }),
        topChannels7d: rawTopChannels.map(r => {
            const c = cMap.get(r.channelId);
            return {
                channelId: r.channelId,
                name: c?.name ?? null,
                handle: c?.handle ?? null,
                avatarUrl: c?.avatarUrl ?? null,
                memberCount: c?.memberCount ?? 0,
                type: c?.type ?? null,
                msgCount: Number(r.total),
            };
        }),
        messagesByDay: dailyRows.map(r => ({
            date: r.date, dm: Number(r.dm), channel: Number(r.channel),
        })),
    });
}
