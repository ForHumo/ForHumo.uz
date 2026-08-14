// Guruh haqida — kengaytirilgan ma'lumot (media count, fayl count, link count, faol a'zolar).
// Chat panel'ida "Guruh haqida" modal orqali ochiladi.
//
//   GET /api/nexus/channels/[id]/about

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const channel = await prisma.nexusChannel.findUnique({ where: { id } });
    if (!channel || channel.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { role: true },
    });
    if (channel.isPrivate && !member) return NextResponse.json({ error: "Yopiq" }, { status: 403 });

    // Kanal xabarlarida media (rasm/video) faqat `media[]` massivda saqlanadi.
    // Fayl/audio alohida field yo'q (channel'da), lekin URL ko'zga tashlash uchun barcha
    // matn ichida linklarni sanaymiz.
    const [mediaCount, linkCount, totalMsgs] = await Promise.all([
        prisma.nexusChannelMessage.count({
            where: { channelId: id, hidden: false, NOT: { media: { isEmpty: true } } },
        }),
        prisma.nexusChannelMessage.count({
            where: { channelId: id, hidden: false, text: { contains: "http" } },
        }),
        prisma.nexusChannelMessage.count({ where: { channelId: id, hidden: false } }),
    ]);

    // Top 5 aktiv yozuvchi (30 kun)
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const rawTop = await prisma.$queryRaw<Array<{ senderId: string; total: bigint }>>`
        SELECT "senderId", COUNT(*)::bigint AS total
        FROM "NexusChannelMessage"
        WHERE "channelId" = ${id}
          AND "createdAt" >= ${monthAgo}
          AND "hidden" = false
        GROUP BY "senderId"
        ORDER BY total DESC
        LIMIT 5
    `;
    const topIds = rawTop.map(r => r.senderId);
    const topProfiles = topIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const pMap = new Map(topProfiles.map(p => [p.id, p]));

    // Rollar bo'yicha a'zolar soni
    const [ownerCount, adminCount, memberCountRoles] = await Promise.all([
        prisma.nexusChannelMember.count({ where: { channelId: id, role: "OWNER" } }),
        prisma.nexusChannelMember.count({ where: { channelId: id, role: "ADMIN" } }),
        prisma.nexusChannelMember.count({ where: { channelId: id, role: "MEMBER" } }),
    ]);

    return NextResponse.json({
        counts: {
            media: mediaCount, links: linkCount, messages: totalMsgs,
            members: { owner: ownerCount, admin: adminCount, member: memberCountRoles },
        },
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
        createdAt: channel.createdAt,
    });
}
