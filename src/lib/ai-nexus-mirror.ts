// Nexus DM'da @ai agentga yozganda avtomatik Humo AI javob beradi.
// Support mirror bilan bir xil naqsh, lekin AI orqali javob.

import { prisma } from "@/lib/prisma";
import { aiChat, aiAvailable } from "@/lib/ai";
import { buildAiSystemPrompt } from "@/lib/ai-context-builder";
import { belisRate } from "@/lib/belis-rate";

const AI_AGENT_USERNAME = "ai";
const RECENT_MSGS = 8;

interface Params {
    senderProfileId: string;
    recipientProfileId: string;
    conversationId: string;
    text: string;
}

export async function mirrorNexusDmToAi(p: Params): Promise<void> {
    try {
        if (!aiAvailable()) return;
        const text = (p.text ?? "").trim();
        if (!text) return;

        const recipient = await prisma.userProfile.findUnique({
            where: { id: p.recipientProfileId },
            select: { username: true, id: true },
        });
        if (recipient?.username?.toLowerCase() !== AI_AGENT_USERNAME) return;

        // Rate limit — AI cost cheklovi
        const rate = await belisRate(p.senderProfileId, "aiChat");
        if (rate.limited) {
            await postAiReply(p.conversationId, recipient.id,
                "Kuniga AI so'rov chegarasi tugadi. Ertaga qayta uring yoki /ai/chat da davom eting.");
            return;
        }

        // Oxirgi 8 xabarni kontexstga olamiz (bu suhbatning)
        const history = await prisma.nexusMessage.findMany({
            where: { conversationId: p.conversationId },
            orderBy: { createdAt: "desc" },
            take: RECENT_MSGS,
            select: { senderId: true, text: true },
        });
        const chatHistory = history.reverse().map(m => ({
            role: m.senderId === recipient.id ? "model" as const : "user" as const,
            text: m.text || "",
        })).filter(m => m.text.length > 0);

        // System prompt (KB + signals bilan)
        const { system } = await buildAiSystemPrompt({
            profileId: p.senderProfileId,
            moduleOrigin: "nexus",
            includeKnowledge: true,
            includeSignals: true,
        });

        const reply = await aiChat(chatHistory, { system, temperature: 0.7 });
        const cleanReply = (reply || "").trim().slice(0, 2000);
        if (!cleanReply) return;

        await postAiReply(p.conversationId, recipient.id, cleanReply);

        // aiUsage log
        try {
            await prisma.aiUsage.create({
                data: { profileId: p.senderProfileId, kind: "nexus-dm-ai" },
            });
        } catch { /* fail-safe */ }
    } catch (e) {
        console.error("mirrorNexusDmToAi failed:", e);
    }
}

/** AI javobini Nexus DM'ga yozib qo'yish. */
async function postAiReply(conversationId: string, aiProfileId: string, text: string): Promise<void> {
    await prisma.nexusMessage.create({
        data: {
            conversationId,
            senderId: aiProfileId,
            text,
            mediaType: "agent",
            agentKind: "humoai",
            agentPayload: { kind: "generic", title: "Humo AI" } as unknown as object,
        },
    });
    const now = new Date();
    // Suhbat lastMessage yangilash
    const conv = await prisma.nexusConversation.findUnique({
        where: { id: conversationId }, select: { user1Id: true },
    });
    if (conv) {
        await prisma.nexusConversation.update({
            where: { id: conversationId },
            data: {
                lastMessageAt: now,
                lastMessageText: text.slice(0, 120),
                lastSenderId: aiProfileId,
                ...(conv.user1Id === aiProfileId ? { user1ReadAt: now } : { user2ReadAt: now }),
            },
        });
    }
}
