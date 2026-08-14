// Guruh/kanal statistika — faqat OWNER va ADMIN.
// Kunlik xabar count (30 kun), top 10 aktiv yozuvchi, o'sish tendensiyasi.
//
//   GET /api/nexus/channels/[id]/stats

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface DailyRow { date: string; count: bigint }

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        return NextResponse.json({ error: "Faqat egasi yoki admin" }, { status: 403 });
    }

    const channel = await prisma.nexusChannel.findUnique({
        where: { id }, select: { name: true, type: true, memberCount: true, createdAt: true },
    });
    if (!channel) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const [today, week, month, total, memberJoined7d, rawTop, dailyRows] = await Promise.all([
        prisma.nexusChannelMessage.count({ where: { channelId: id, createdAt: { gte: dayAgo } } }),
        prisma.nexusChannelMessage.count({ where: { channelId: id, createdAt: { gte: weekAgo } } }),
        prisma.nexusChannelMessage.count({ where: { channelId: id, createdAt: { gte: monthAgo } } }),
        prisma.nexusChannelMessage.count({ where: { channelId: id } }),
        prisma.nexusChannelMember.count({ where: { channelId: id, joinedAt: { gte: weekAgo } } }),

        // Top 10 yozuvchi 30 kun
        prisma.$queryRaw<Array<{ senderId: string; total: bigint }>>`
            SELECT "senderId", COUNT(*)::bigint AS total
            FROM "NexusChannelMessage"
            WHERE "channelId" = ${id}
              AND "createdAt" >= ${monthAgo}
              AND "hidden" = false
            GROUP BY "senderId"
            ORDER BY total DESC
            LIMIT 10
        `,

        // 30 kunlik kunlik chart
        prisma.$queryRaw<DailyRow[]>`
            SELECT
                to_char(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(m.cnt, 0)::bigint AS count
            FROM generate_series(
                (NOW() - INTERVAL '29 days')::date,
                NOW()::date,
                INTERVAL '1 day'
            ) AS d(day)
            LEFT JOIN (
                SELECT DATE_TRUNC('day', "createdAt")::date AS day, COUNT(*) AS cnt
                FROM "NexusChannelMessage"
                WHERE "channelId" = ${id}
                  AND "createdAt" >= NOW() - INTERVAL '30 days'
                  AND "hidden" = false
                GROUP BY 1
            ) m ON m.day = d.day
            ORDER BY date ASC
        `,
    ]);

    // Top profillar
    const topIds = rawTop.map(r => r.senderId);
    const topProfiles = topIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const pMap = new Map(topProfiles.map(p => [p.id, p]));

    return NextResponse.json({
        channel: {
            name: channel.name, type: channel.type,
            memberCount: channel.memberCount, createdAt: channel.createdAt,
        },
        messages: { today, week, month, total },
        members: { total: channel.memberCount, joinedThisWeek: memberJoined7d },
        topContributors: rawTop.map(r => {
            const p = pMap.get(r.senderId);
            return {
                profileId: r.senderId,
                name: p?.name ?? null,
                username: p?.username ?? null,
                image: p?.image ?? null,
                count: Number(r.total),
            };
        }),
        messagesByDay: dailyRows.map(r => ({ date: r.date, count: Number(r.count) })),
        generatedAt: now.toISOString(),
    });
}
