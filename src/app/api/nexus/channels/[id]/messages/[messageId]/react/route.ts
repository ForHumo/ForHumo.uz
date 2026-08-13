// Kanal/guruh xabariga reaksiya (toggle).
//   POST /api/nexus/channels/[id]/messages/[messageId]/react  { emoji }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_EMOJI_BYTES = 16;

export async function POST(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, messageId } = await params;
    const body = await req.json().catch(() => ({}));
    const emoji = String(body?.emoji ?? "").trim().slice(0, MAX_EMOJI_BYTES);
    if (!emoji) return NextResponse.json({ error: "emoji kerak" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    // A'zo bo'lish talab qilinadi (Nexus channel qoidasi)
    const member = await prisma.nexusChannelMember.findUnique({
        where: { channelId_profileId: { channelId: id, profileId: me.id } }, select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Avval a'zo bo'ling" }, { status: 403 });

    const msg = await prisma.nexusChannelMessage.findUnique({
        where: { id: messageId }, select: { channelId: true },
    });
    if (!msg || msg.channelId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Toggle
    const existing = await prisma.nexusChannelMessageReaction.findUnique({
        where: { messageId_profileId_emoji: { messageId, profileId: me.id, emoji } },
    });
    if (existing) {
        await prisma.nexusChannelMessageReaction.delete({ where: { id: existing.id } });
    } else {
        await prisma.nexusChannelMessageReaction.create({ data: { messageId, profileId: me.id, emoji } });
    }

    const all = await prisma.nexusChannelMessageReaction.findMany({
        where: { messageId }, select: { emoji: true, profileId: true },
    });
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of all) {
        const cur = map.get(r.emoji) ?? { count: 0, mine: false };
        cur.count++;
        if (r.profileId === me.id) cur.mine = true;
        map.set(r.emoji, cur);
    }
    return NextResponse.json({
        ok: true,
        reactions: [...map.entries()].map(([e, s]) => ({ emoji: e, count: s.count, mine: s.mine })),
    });
}
