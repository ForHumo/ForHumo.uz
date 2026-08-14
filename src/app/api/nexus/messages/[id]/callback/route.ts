// Agent inline tugma callback — foydalanuvchi tugma bosganda agent webhook'iga
// event="callback.query" yuboriladi. Agent javob qaytarsa yangi xabar sifatida yoziladi.
//
//   POST /api/nexus/messages/[id]/callback
//     body: { messageId, callbackData }

import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otherId } from "@/lib/nexus-dm";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";
import { sendToAgentWebhook } from "@/lib/agent-webhook";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true, username: true, name: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const messageId = typeof body.messageId === "string" ? body.messageId : null;
    const callbackData = typeof body.callbackData === "string" ? body.callbackData.slice(0, 64) : null;
    if (!messageId || !callbackData) return NextResponse.json({ error: "messageId + callbackData kerak" }, { status: 400 });

    const conv = await prisma.nexusConversation.findUnique({
        where: { id }, select: { user1Id: true, user2Id: true },
    });
    if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    if (conv.user1Id !== me.id && conv.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    // Xabar shu suhbatga tegishli va agent tomonidan yuborilgan bo'lishi kerak
    const msg = await prisma.nexusMessage.findUnique({
        where: { id: messageId },
        select: { id: true, conversationId: true, senderId: true, buttons: true },
    });
    if (!msg || msg.conversationId !== id) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });

    const otherPeerId = otherId(conv, me.id);
    if (msg.senderId !== otherPeerId) {
        return NextResponse.json({ error: "Bu tugma agent xabariga tegishli emas" }, { status: 400 });
    }

    // Callback data tugmalar orasida haqiqatan borligini tekshirish (spoofing himoyasi)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = Array.isArray(msg.buttons) ? (msg.buttons as any[]) : [];
    let found = false;
    for (const row of rows) {
        if (!Array.isArray(row)) continue;
        for (const btn of row) {
            if (btn && typeof btn === "object" && btn.callbackData === callbackData) { found = true; break; }
        }
        if (found) break;
    }
    if (!found) return NextResponse.json({ error: "Callback data topilmadi" }, { status: 400 });

    // Agent'ga webhook fire
    const agent = await prisma.nexusAgent.findUnique({
        where: { profileId: otherPeerId },
        select: { profileId: true, webhookUrl: true, apiKey: true },
    });
    if (!agent || !agent.webhookUrl || !agent.apiKey) {
        return NextResponse.json({ ok: true, note: "Agent webhook sozlanmagan" });
    }

    after(async () => {
        const reply = await sendToAgentWebhook(agent, {
            event: "callback.query",
            chatId: id,
            messageId,
            from: {
                profileId: me.id,
                username: me.username ?? null,
                name: me.name ?? null,
            },
            text: "",
            mediaUrl: null,
            mediaType: null,
            callbackData,
            timestamp: Math.floor(Date.now() / 1000),
        });
        if (!reply) return;

        const agentMsg = await prisma.nexusMessage.create({
            data: {
                conversationId: id,
                senderId: otherPeerId,
                text: reply.text ?? "",
                mediaUrl: reply.mediaUrl ?? null,
                mediaType: reply.mediaType ?? null,
                mediaMime: reply.mediaMime ?? null,
                mediaName: reply.mediaName ?? null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(reply.buttons ? { buttons: reply.buttons as any } : {}),
            },
        });
        const preview = agentMsg.text || (agentMsg.mediaType ? `[${agentMsg.mediaType}]` : "Yangi xabar");
        await prisma.nexusConversation.update({
            where: { id },
            data: {
                lastMessageAt: new Date(),
                lastMessageText: preview.slice(0, 120),
                lastSenderId: otherPeerId,
            },
        });
        await pusherTrigger(userChannel(me.id), "nx:msg:new", {
            convId: id,
            message: {
                id: agentMsg.id, text: agentMsg.text, mine: false, createdAt: agentMsg.createdAt,
                mediaUrl: agentMsg.mediaUrl, mediaType: agentMsg.mediaType,
                mediaMime: agentMsg.mediaMime, mediaName: agentMsg.mediaName,
                senderId: otherPeerId, buttons: agentMsg.buttons, reactions: [],
            },
        });
    });

    return NextResponse.json({ ok: true });
}
