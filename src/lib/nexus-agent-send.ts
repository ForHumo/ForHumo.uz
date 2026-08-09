// Agent DM yuborish (server-only).
// Foydalanuvchiga NexusMessage strukturaviy karta bilan boradi.

import { prisma } from "@/lib/prisma";
import { normalizePair } from "@/lib/nexus-dm";

export interface AgentPayload {
    kind: "product-review" | "support-status" | "pay-tx" | "generic";
    // Umumiy maydonlar
    title?: string;
    image?: string;
    body?: string;
    // product-review uchun
    productId?: string;
    productSlug?: string;
    price?: number;
    currency?: "UZS" | "USD";
    requestedRating?: boolean;
    orderId?: string;
    // pay-tx uchun
    amount?: number;
    txRef?: string;
}

/**
 * Agent xabari yuboradi. Suhbat (NexusConversation) avtomatik yaratiladi.
 * Agent → user bir tomonlama; foydalanuvchi javob berishi mumkin, lekin
 * javoblar strukturaviy (rating, media, matn) sifatida qayta ishlanadi.
 */
export async function sendAgentDM(input: {
    agentUsername: string;         // "market_agent" (@ belgisisiz)
    toProfileId: string;
    payload: AgentPayload;
    kind?: string;                  // agentKind
}): Promise<{ ok: boolean; conversationId?: string; messageId?: string; error?: string }> {
    try {
        const agent = await prisma.userProfile.findUnique({
            where: { username: input.agentUsername },
            select: { id: true, username: true, name: true, image: true },
        });
        if (!agent) return { ok: false, error: "agent_not_found" };

        // Suhbat topish yoki yaratish (user1Id<user2Id normalizatsiyasi)
        const [u1, u2] = normalizePair(agent.id, input.toProfileId);
        let conv = await prisma.nexusConversation.findUnique({
            where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        });
        if (!conv) {
            conv = await prisma.nexusConversation.create({
                data: { user1Id: u1, user2Id: u2 },
            });
        }

        const preview = input.payload.title || (input.kind === "product-review" ? "Sharh so'rovi" : "Yangi xabar");

        const msg = await prisma.nexusMessage.create({
            data: {
                conversationId: conv.id,
                senderId: agent.id,
                text: input.payload.body ?? "",
                mediaType: "agent",
                agentKind: input.kind ?? input.payload.kind,
                agentPayload: input.payload as unknown as object,
            },
        });

        await prisma.nexusConversation.update({
            where: { id: conv.id },
            data: {
                lastMessageAt: new Date(),
                lastMessageText: preview.slice(0, 120),
                lastSenderId: agent.id,
                // Agent yubordi → foydalanuvchi o'qimagan (u1 yoki u2 aniqlanadi)
                ...(u1 === agent.id ? { user1ReadAt: new Date() } : { user2ReadAt: new Date() }),
            },
        });

        return { ok: true, conversationId: conv.id, messageId: msg.id };
    } catch (e) {
        console.error("sendAgentDM failed:", e);
        return { ok: false, error: e instanceof Error ? e.message : "unknown" };
    }
}
