// Agent webhook ping — egasi HTTP webhook'ini sinab ko'radi.
// POST /api/nexus/agents/[id]/webhook-ping
// Response: { ok: bool, status?: number, elapsedMs: number, error?: string, replyPreview?: string }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendToAgentWebhook } from "@/lib/agent-webhook";
import { logAgentCall } from "@/lib/agent-log";
import { after } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const agent = await prisma.nexusAgent.findUnique({
        where: { id }, select: { id: true, ownerId: true, webhookUrl: true, apiKey: true, profile: { select: { username: true } } },
    });
    if (!agent) return NextResponse.json({ error: "Agent topilmadi" }, { status: 404 });
    if (agent.ownerId !== me.id) return NextResponse.json({ error: "Faqat egasi test qila oladi" }, { status: 403 });
    if (!agent.webhookUrl) return NextResponse.json({ ok: false, error: "Webhook URL sozlanmagan" });
    if (!agent.apiKey) return NextResponse.json({ ok: false, error: "API kaliti generatsiya qilinmagan" });

    const startedAt = Date.now();
    try {
        const reply = await sendToAgentWebhook(
            { webhookUrl: agent.webhookUrl, apiKey: agent.apiKey },
            {
                event: "webhook.ping",
                chatId: "ping",
                messageId: "ping",
                from: { profileId: me.id, username: null, name: "Ping" },
                text: "ping",
                mediaUrl: null,
                mediaType: null,
                timestamp: Math.floor(Date.now() / 1000),
            }
        );
        const elapsedMs = Date.now() - startedAt;
        if (!reply) {
            after(() => logAgentCall({ agentId: id, event: "webhook.ping", ok: false, elapsedMs, error: "no_reply", preview: "ping" }));
            return NextResponse.json({ ok: false, elapsedMs, error: "Webhook javob bermadi yoki xato qaytardi" });
        }
        const replyPreview = reply.text ? String(reply.text).slice(0, 200) : (reply.mediaUrl ? `[${reply.mediaType ?? "media"}]` : "OK");
        after(() => logAgentCall({ agentId: id, event: "webhook.ping", ok: true, elapsedMs, preview: replyPreview }));
        return NextResponse.json({ ok: true, elapsedMs, replyPreview });
    } catch (e) {
        const elapsedMs = Date.now() - startedAt;
        const errMsg = e instanceof Error ? e.message : "Ping muvaffaqiyatsiz";
        after(() => logAgentCall({ agentId: id, event: "webhook.ping", ok: false, elapsedMs, error: errMsg, preview: "ping" }));
        return NextResponse.json({ ok: false, elapsedMs, error: errMsg });
    }
}
