// "Hamma uchun o'chirish" — WhatsApp uslubi. 60 daqiqa ichida yozuvchi
// xabarni ikkalasi uchun ham o'chira oladi.
//
//   POST /api/nexus/messages/[id]/delete-for-everyone
//     body: { messageId }
//   Faqat sender va 60 daqiqa ichida. Matn/media tozalanadi, deletedForEveryoneAt yoziladi.
//   Client tomon "Bu xabar o'chirildi" tombstone ko'rsatadi.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otherId } from "@/lib/nexus-dm";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";
import { fireAgentEventIfPeer } from "@/lib/agent-webhook";

const WINDOW_MS = 60 * 60 * 1000; // 60 daqiqa

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const messageId = typeof body.messageId === "string" ? body.messageId : null;
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });

    const conv = await prisma.nexusConversation.findUnique({
        where: { id }, select: { user1Id: true, user2Id: true },
    });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId },
        select: { id: true, senderId: true, createdAt: true, conversationId: true, deletedForEveryoneAt: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    if (msg.senderId !== me.id) return NextResponse.json({ error: "Faqat yozuvchi hamma uchun o'chira oladi" }, { status: 403 });
    if (msg.deletedForEveryoneAt) return NextResponse.json({ ok: true, alreadyDeleted: true });

    const ageMs = Date.now() - msg.createdAt.getTime();
    if (ageMs > WINDOW_MS) {
        return NextResponse.json({
            error: "60 daqiqa muddati o'tgan — faqat o'zingizdan o'chira olasiz",
            code: "WINDOW_EXPIRED",
        }, { status: 400 });
    }

    // Matn va media tozalash, tombstone qoldirish
    const now = new Date();
    await prisma.nexusMessage.update({
        where: { id: messageId },
        data: {
            text: "",
            mediaUrl: null, mediaType: null, mediaMime: null, mediaName: null, mediaSize: null, durationMs: null,
            pollQuestion: null, pollOptions: [],
            locLat: null, locLng: null, locUpdatedAt: null, locExpiresAt: null,
            deletedForEveryoneAt: now,
        },
    });

    // Real-time — ikkalasiga ham
    const otherPeerId = otherId(conv, me.id);
    after(() => pusherTrigger(userChannel(otherPeerId), "nx:msg:delete", { convId: id, messageId, tombstone: true, deletedAt: now.toISOString() }));
    after(() => pusherTrigger(userChannel(me.id), "nx:msg:delete", { convId: id, messageId, tombstone: true, deletedAt: now.toISOString() }));

    // Agent system event — peer agent bo'lsa message.deleted webhook fire
    after(() => fireAgentEventIfPeer(prisma, otherPeerId, {
        event: "message.deleted",
        chatId: id,
        messageId,
        text: "",
        mediaUrl: null,
        mediaType: null,
        fromProfileId: me.id,
    }));

    return NextResponse.json({ ok: true, deletedAt: now.toISOString() });
}
