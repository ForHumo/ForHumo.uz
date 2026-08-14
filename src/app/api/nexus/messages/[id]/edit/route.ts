// O'z xabarni tahrirlash (faqat matn qismi).
//   POST /api/nexus/messages/[convId]/edit
//     body: { messageId, text }

import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otherId } from "@/lib/nexus-dm";
import { fireAgentEventIfPeer } from "@/lib/agent-webhook";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId ?? "").trim();
    const text = String(body?.text ?? "").trim().slice(0, 2000);
    if (!messageId) return NextResponse.json({ error: "messageId kerak" }, { status: 400 });
    if (text.length < 1) return NextResponse.json({ error: "Matn bo'sh bo'lmasin" }, { status: 400 });

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId }, select: { id: true, senderId: true, conversationId: true, text: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (msg.senderId !== me.id) return NextResponse.json({ error: "Faqat o'z xabaringizni tahrirlaysiz" }, { status: 403 });

    // Eski matnni tarixga saqlash
    await prisma.nexusMessageEdit.create({
        data: { messageId: msg.id, previousText: msg.text ?? "" },
    });

    const updated = await prisma.nexusMessage.update({
        where: { id: messageId }, data: { text, editedAt: new Date() },
    });

    // Agent system event — peer agent bo'lsa uning webhook'iga message.edited fire
    const conv = await prisma.nexusConversation.findUnique({
        where: { id }, select: { user1Id: true, user2Id: true },
    });
    if (conv) {
        const peerId = otherId(conv, me.id);
        const previousText = msg.text ?? "";
        after(() => fireAgentEventIfPeer(prisma, peerId, {
            event: "message.edited",
            chatId: id,
            messageId: updated.id,
            text: updated.text,
            mediaUrl: null,
            mediaType: null,
            previousText,
            fromProfileId: me.id,
        }));
    }

    return NextResponse.json({ ok: true, message: { id: updated.id, text: updated.text, editedAt: updated.editedAt } });
}
