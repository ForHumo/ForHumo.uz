// Xabarga emoji reaksiya (toggle).
//   POST /api/nexus/messages/[convId]/react
//     body: { messageId, emoji }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_EMOJI_BYTES = 16;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId ?? "").trim();
    const emoji = String(body?.emoji ?? "").trim().slice(0, MAX_EMOJI_BYTES);
    if (!messageId || !emoji) return NextResponse.json({ error: "messageId va emoji kerak" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId }, select: { id: true, conversationId: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Toggle: mavjud bo'lsa o'chir, yo'q bo'lsa qo'sh
    const existing = await prisma.nexusMessageReaction.findUnique({
        where: { messageId_profileId_emoji: { messageId, profileId: me.id, emoji } },
    });
    if (existing) {
        await prisma.nexusMessageReaction.delete({ where: { id: existing.id } });
    } else {
        await prisma.nexusMessageReaction.create({ data: { messageId, profileId: me.id, emoji } });
    }

    // Yangi statistika
    const all = await prisma.nexusMessageReaction.findMany({
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
        reactions: [...map.entries()].map(([emoji, s]) => ({ emoji, count: s.count, mine: s.mine })),
    });
}
