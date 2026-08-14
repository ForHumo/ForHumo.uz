// View-once xabarni ochish. Qabul qiluvchi bir marta ochadi — viewedAt yoziladi.
// Server javobi bir marta media URL qaytaradi; keyingi ochish urinishlarida null.
//
//   POST /api/nexus/messages/[id]/view-once
//     body: { messageId }
//   → { mediaUrl, mediaType, mediaMime, text, viewedAt }
//   Ikkinchi POST'da: { error: "Ko'rilgan", code: "ALREADY_VIEWED" }

import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otherId } from "@/lib/nexus-dm";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId },
        select: {
            id: true, conversationId: true, senderId: true, viewOnce: true, viewedAt: true,
            text: true, mediaUrl: true, mediaType: true, mediaMime: true, mediaName: true,
        },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    if (!msg.viewOnce) return NextResponse.json({ error: "Bu view-once xabar emas" }, { status: 400 });
    // Sender o'zi ochsa — hech nima o'zgarmaydi (o'z xabarini ko'rish)
    if (msg.senderId === me.id) {
        return NextResponse.json({
            mediaUrl: msg.mediaUrl, mediaType: msg.mediaType, mediaMime: msg.mediaMime,
            mediaName: msg.mediaName, text: msg.text, mine: true, viewedAt: msg.viewedAt,
        });
    }
    if (msg.viewedAt) {
        return NextResponse.json({ error: "Ko'rilgan", code: "ALREADY_VIEWED" }, { status: 410 });
    }

    // Ko'rildi belgilash — atomik
    const now = new Date();
    const updated = await prisma.nexusMessage.updateMany({
        where: { id: messageId, viewedAt: null },
        data: { viewedAt: now },
    });
    if (updated.count === 0) {
        return NextResponse.json({ error: "Ko'rilgan", code: "ALREADY_VIEWED" }, { status: 410 });
    }

    // Sender'ga real-time: xabar ochildi
    const senderId = msg.senderId;
    after(() => pusherTrigger(userChannel(senderId), "nx:msg:viewed", {
        convId: id, messageId, viewedAt: now.toISOString(),
    }));

    return NextResponse.json({
        mediaUrl: msg.mediaUrl, mediaType: msg.mediaType, mediaMime: msg.mediaMime,
        mediaName: msg.mediaName, text: msg.text, viewedAt: now.toISOString(),
    });
}
