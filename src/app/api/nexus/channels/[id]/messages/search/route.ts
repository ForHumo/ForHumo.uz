// Kanal ichida server-side qidiruv (100+ xabarli kanallar uchun).
//   GET /api/nexus/channels/[id]/messages/search?q=X&limit=50

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    if (q.length < 2) return NextResponse.json({ results: [], total: 0 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // Xususiy kanal — faqat a'zolarga
    const ch = await prisma.nexusChannel.findUnique({
        where: { id }, select: { isPrivate: true, hidden: true },
    });
    if (!ch || ch.hidden) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    if (ch.isPrivate) {
        const member = await prisma.nexusChannelMember.findUnique({
            where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
        });
        if (!member) return NextResponse.json({ error: "Yopiq kanal" }, { status: 403 });
    }

    const where = {
        channelId: id,
        hidden: false,
        text: { contains: q, mode: "insensitive" as const },
    };
    const [rows, total] = await Promise.all([
        prisma.nexusChannelMessage.findMany({
            where, orderBy: { createdAt: "desc" }, take: limit,
            select: {
                id: true, text: true, senderId: true, createdAt: true, media: true,
            },
        }),
        prisma.nexusChannelMessage.count({ where }),
    ]);
    const senderIds = [...new Set(rows.map(r => r.senderId))];
    const senders = await prisma.userProfile.findMany({
        where: { id: { in: senderIds } }, select: { id: true, name: true, username: true, image: true },
    });
    const sMap = new Map(senders.map(s => [s.id, s]));

    return NextResponse.json({
        results: rows.map(r => {
            const s = sMap.get(r.senderId);
            return {
                id: r.id,
                text: r.text,
                createdAt: r.createdAt,
                mine: r.senderId === me.id,
                hasMedia: r.media.length > 0,
                sender: s ? { name: s.name, username: s.username, image: s.image } : null,
            };
        }),
        total,
    });
}
