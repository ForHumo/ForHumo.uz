// GET /channels/[id]/pinned — barcha pinlangan xabarlar ro'yxati (yangi birinchi).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } },
        select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const msgs = await prisma.nexusChannelMessage.findMany({
        where: { channelId: id, pinnedAt: { not: null }, hidden: false, deletedForEveryoneAt: null },
        orderBy: { pinnedAt: "desc" },
        take: 100,
        select: {
            id: true, text: true, media: true, mediaType: true, createdAt: true, pinnedAt: true,
            senderId: true, anonymous: true,
        },
    });
    const profiles = await prisma.userProfile.findMany({
        where: { id: { in: Array.from(new Set(msgs.map(m => m.senderId))) } },
        select: { id: true, name: true, username: true, image: true },
    });
    const pMap = new Map(profiles.map(p => [p.id, p]));
    return NextResponse.json({
        pinned: msgs.map(m => ({
            id: m.id, text: m.text, media: m.media, mediaType: m.mediaType,
            createdAt: m.createdAt, pinnedAt: m.pinnedAt,
            author: m.anonymous ? null : (pMap.get(m.senderId) ?? null),
        })),
    });
}
