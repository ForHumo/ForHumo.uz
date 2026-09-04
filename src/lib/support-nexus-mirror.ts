// Foydalanuvchi @support NexusAgent'ga DM yozganda:
//   1. Avval SupportMessage USER role bilan yozib qo'yiladi (mavjud audit)
//   2. Ticket topiladi/yaratiladi
//   3. C YONDASHUV — AI first-line:
//      - Ticket eskalatsiya bo'lmagan bo'lsa
//      - Va AI limit oshib ketmagan bo'lsa
//      - Gemini javob generatsiya qiladi
//      - Reply Nexus DM'ga qaytariladi (@support agent yuboradi)
//      - SupportMessage AI role bilan yoziladi
//   4. AI ishonchsiz yoki user human so'ragan bo'lsa → eskalatsiya
//      → Ticket escalated=true, admin bell/push (kelajakda)
//
// Fail-safe: har qanday xato jim o'tadi (asosiy DM oqimi buzilmasin)

import { prisma } from "@/lib/prisma";
import {
    generateSupportAiReply, aiSupportRateLimited, logAiSupport,
    aiRepliesCount, userRequestedHuman,
    AI_MAX_MSGS_PER_TICKET, AI_MODEL_NAME, AI_MIN_CONFIDENCE,
} from "@/lib/support-ai";

interface Params {
    senderProfileId: string;
    recipientProfileId: string;
    conversationId: string;
    text: string;
    module?: string;
}

const SUPPORT_AGENT_USERNAME = "support";
const MAX_SUBJECT_LEN = 80;
const MAX_BODY_LEN = 2000;

export async function mirrorNexusDmToSupport(p: Params): Promise<void> {
    try {
        // Faqat @support agentga yuborilgan bo'lsa
        const recipient = await prisma.userProfile.findUnique({
            where: { id: p.recipientProfileId },
            select: { username: true, id: true },
        });
        if (recipient?.username?.toLowerCase() !== SUPPORT_AGENT_USERNAME) return;

        const text = (p.text ?? "").trim();
        if (!text) return;

        // Ticket topish yoki yaratish
        let ticket = await prisma.supportTicket.findFirst({
            where: {
                profileId: p.senderProfileId,
                status: { in: ["open", "pending"] },
            },
            orderBy: { updatedAt: "desc" },
            select: { id: true, escalated: true, aiHandled: true, module: true },
        });

        if (ticket) {
            await prisma.supportMessage.create({
                data: {
                    ticketId: ticket.id,
                    authorRole: "USER",
                    body: text.slice(0, MAX_BODY_LEN),
                },
            });
            await prisma.supportTicket.update({
                where: { id: ticket.id },
                data: { status: "open", updatedAt: new Date() },
            });
        } else {
            const sender = await prisma.userProfile.findUnique({
                where: { id: p.senderProfileId },
                select: { email: true, name: true },
            });
            const subject = text.slice(0, MAX_SUBJECT_LEN).replace(/\s+/g, " ") || "Nexus DM murojaat";
            const body = text.slice(0, MAX_BODY_LEN);
            ticket = await prisma.supportTicket.create({
                data: {
                    profileId: p.senderProfileId,
                    email: sender?.email ?? "unknown@nexus-dm",
                    subject,
                    message: body,
                    module: p.module ?? "nexus",
                    status: "open",
                    messages: {
                        create: {
                            authorRole: "USER",
                            body,
                        },
                    },
                },
                select: { id: true, escalated: true, aiHandled: true, module: true },
            });
        }

        // ── C: AI first-line ──────────────────────────────────────────────
        // Ticket allaqachon eskalatsiya bo'lgan bo'lsa AI aralashmaydi
        if (ticket.escalated) return;

        // Bu ticketda AI cheklovi
        const [aiCount, rateLimited] = await Promise.all([
            aiRepliesCount(ticket.id),
            aiSupportRateLimited(p.senderProfileId),
        ]);

        // Foydalanuvchi human'ni chaqirdimi?
        if (userRequestedHuman(text)) {
            await escalateAndNotify(ticket.id, "user_requested", recipient.id);
            return;
        }

        if (aiCount >= AI_MAX_MSGS_PER_TICKET) {
            await escalateAndNotify(ticket.id, "ai_limit", recipient.id);
            return;
        }
        if (rateLimited) {
            // Kunlik limit oshib ketdi — jim o'tamiz, admin ko'radi
            return;
        }

        // Oxirgi 6 xabarni context sifatida beraylik
        const prior = await prisma.supportMessage.findMany({
            where: { ticketId: ticket.id },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: { authorRole: true, body: true },
        });
        const priorReversed = prior.reverse();

        const sender = await prisma.userProfile.findUnique({
            where: { id: p.senderProfileId },
            select: { name: true },
        });

        const aiReply = await generateSupportAiReply({
            userText: text,
            userName: sender?.name ?? null,
            priorMessages: priorReversed.map(m => ({
                role: m.authorRole === "USER" ? "user" : m.authorRole === "AI" ? "ai" : "admin",
                body: m.body,
            })),
        });

        // AI xato bergan yoki bo'sh — jim o'tamiz (admin ko'radi)
        if (!aiReply || !aiReply.reply) return;

        // Ishonch past yoki AI o'zi escalate desa → eskalatsiya (lekin xayrli javob ham qaytaradi)
        const shouldEscalate = aiReply.escalate || aiReply.confidence < AI_MIN_CONFIDENCE;

        // Modul aniqlangan bo'lsa — ticket'da yangilaymiz
        if (aiReply.module && !ticket.module) {
            await prisma.supportTicket.update({
                where: { id: ticket.id },
                data: { module: aiReply.module },
            });
        }

        // AI javob — Nexus DM'ga (agent yuboradi) + SupportMessage AI
        await prisma.$transaction([
            prisma.nexusMessage.create({
                data: {
                    conversationId: p.conversationId,
                    senderId: recipient.id,
                    text: aiReply.reply,
                    mediaType: "agent",
                    agentKind: "support-ai",
                    agentPayload: {
                        kind: "generic",
                        title: shouldEscalate ? "AI javob (adminga yo'naltirilyapti)" : "AI javob",
                        confidence: aiReply.confidence,
                    },
                },
            }),
            prisma.nexusConversation.update({
                where: { id: p.conversationId },
                data: {
                    lastMessageAt: new Date(),
                    lastMessageText: aiReply.reply.slice(0, 120),
                    lastSenderId: recipient.id,
                    ...(await conversationReadUpdate(p.conversationId, recipient.id)),
                },
            }),
            prisma.supportMessage.create({
                data: {
                    ticketId: ticket.id,
                    authorRole: "AI",
                    authorId: recipient.id,
                    body: aiReply.reply,
                    aiModel: AI_MODEL_NAME,
                    aiConfidence: aiReply.confidence,
                },
            }),
            prisma.supportTicket.update({
                where: { id: ticket.id },
                data: {
                    aiHandled: true,
                    aiConfidence: aiReply.confidence,
                    status: shouldEscalate ? "open" : "pending",
                },
            }),
        ]);

        await logAiSupport(p.senderProfileId);

        if (shouldEscalate) {
            await escalateAndNotify(
                ticket.id,
                aiReply.escalate ? (aiReply.reason || "ai_low_confidence") : "ai_low_confidence",
                recipient.id,
            );
        }
    } catch (e) {
        console.error("mirrorNexusDmToSupport failed:", e);
    }
}

/** Ticket'ni eskalatsiya qilish + admin bildirishnoma yuborish. */
async function escalateAndNotify(ticketId: string, reason: string, supportAgentId: string): Promise<void> {
    try {
        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
                escalated: true,
                escalatedAt: new Date(),
                escalatedReason: reason,
                status: "open",
            },
        });

        // Founderlarga (admin) bell notif
        const { nexusNotify } = await import("@/lib/nexus-notify");
        const { FOUNDER_HUMO_IDS, FOUNDER_USERNAMES } = await import("@/lib/founders");
        const founders = await prisma.userProfile.findMany({
            where: {
                OR: [
                    { humoId: { in: FOUNDER_HUMO_IDS } },
                    { username: { in: FOUNDER_USERNAMES } },
                ],
            },
            select: { id: true },
        });
        for (const f of founders) {
            await nexusNotify({
                recipientId: f.id,
                actorId: supportAgentId,
                type: "SUPPORT",
                ticketId,
                customBody: `Insonga eskalatsiya: ${reason}`,
            });
        }
    } catch (e) {
        console.error("escalateAndNotify failed:", e);
    }
}

/** Suhbat readAt'ni tegishli maydonga yozish (agent yubordi → agent tarafida o'qilgan). */
async function conversationReadUpdate(convId: string, agentId: string): Promise<Record<string, Date>> {
    const conv = await prisma.nexusConversation.findUnique({
        where: { id: convId },
        select: { user1Id: true },
    });
    if (!conv) return {};
    return conv.user1Id === agentId
        ? { user1ReadAt: new Date() }
        : { user2ReadAt: new Date() };
}
