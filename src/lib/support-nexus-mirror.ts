// Foydalanuvchi @support NexusAgent'ga DM yozganda avtomatik SupportMessage
// USER role bilan tarixga qo'shiladi (ikki tomonlama ko'prik — A yondashuv).
//
// Qoida:
//   - Faqat qabul qiluvchi @support (username = "support") bo'lgan holatda ishlaydi
//   - Foydalanuvchining oxirgi OCHIQ (open|pending) tiketi topilib, unga message qo'shiladi
//   - Ochiq tiket yo'q bo'lsa — yangi tiket yaratiladi (subject = "Nexus DM murojaat")
//   - Fail-safe: har qanday xato jim o'tadi (asosiy DM oqimi buzilmasin)

import { prisma } from "@/lib/prisma";

interface Params {
    senderProfileId: string;
    recipientProfileId: string;
    text: string;
    module?: string;  // ixtiyoriy — hozirgi modul (belis/bn/market/pay)
}

const SUPPORT_AGENT_USERNAME = "support";
const MAX_SUBJECT_LEN = 80;
const MAX_BODY_LEN = 2000;

export async function mirrorNexusDmToSupport(p: Params): Promise<void> {
    try {
        // Faqat @support agentga yuborilgan bo'lsa
        const recipient = await prisma.userProfile.findUnique({
            where: { id: p.recipientProfileId },
            select: { username: true },
        });
        if (recipient?.username?.toLowerCase() !== SUPPORT_AGENT_USERNAME) return;

        const text = (p.text ?? "").trim();
        if (!text) return;

        // Oxirgi ochiq/pending tiket bor bo'lsa — unga qo'sh
        const openTicket = await prisma.supportTicket.findFirst({
            where: {
                profileId: p.senderProfileId,
                status: { in: ["open", "pending"] },
            },
            orderBy: { updatedAt: "desc" },
            select: { id: true },
        });

        if (openTicket) {
            await prisma.supportMessage.create({
                data: {
                    ticketId: openTicket.id,
                    authorRole: "USER",
                    body: text.slice(0, MAX_BODY_LEN),
                },
            });
            // Ochiq tiketda mijoz javob berdi → status "open" ga qaytadi (agar pending edi)
            await prisma.supportTicket.update({
                where: { id: openTicket.id },
                data: { status: "open", updatedAt: new Date() },
            });
            return;
        }

        // Yangi tiket — email va boshlang'ich xabar majburiy (schema)
        const sender = await prisma.userProfile.findUnique({
            where: { id: p.senderProfileId },
            select: { email: true },
        });
        const subject = text.slice(0, MAX_SUBJECT_LEN).replace(/\s+/g, " ") || "Nexus DM murojaat";
        const body = text.slice(0, MAX_BODY_LEN);
        await prisma.supportTicket.create({
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
        });
    } catch (e) {
        console.error("mirrorNexusDmToSupport failed:", e);
    }
}
