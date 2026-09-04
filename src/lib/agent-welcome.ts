// Rasmiy For Humo agentlari uchun DM welcome xabarlari.
// Foydalanuvchi @forhumo/@id/@ai/@nexus/@esport/@market/@pay/@bn/@support
// bilan DM birinchi ochganda agent avto-salomlashadi.

import { prisma } from "@/lib/prisma";

const WELCOME_BY_MODULE: Record<string, string> = {
    MAIN: "Assalomu alaykum! For Humo super-app'ga xush kelibsiz. Men — @forhumo, umumiy agentman. Savol yoki taklifingiz bo'lsa yozing — men sizni to'g'ri modulga yo'naltiraman.\n\nModullar: Humo ID (identitiy), Humo AI (yordamchi), Humo Nexus (ijtimoiy), Humo eSport (sport), Humo Market (savdo), For Pay (to'lov), Bozor Narxida (narxlar), Humo Support (yordam).",
    ID: "Salom! Men — Humo ID agentiman. Profil, verifikatsiya, xavfsizlik va login-history bo'yicha yordam beraman. Nima qilishimni istaysiz?",
    AI: "Salom! Men — Humo AI. Har qanday savolingizga javob berish, matn yozish, tarjima va analitika bilan yordam beraman. Nima ustida ishlaymiz?",
    NEXUS: "Salom! Men — Humo Nexus agentiman. Post, video, jonli efir, DM, kanal va guruhlar bo'yicha yordam beraman.",
    ESPORT: "Salom! Men — Humo eSport agentiman. Jamoalar, turnirlar, o'yinlar va reyting bo'yicha yordam beraman.",
    MARKET: "Salom! Men — Humo Market agentiman. Mahsulot izlash, buyurtma, savat va sotuvchi bilan bog'lanish bo'yicha yordam beraman.",
    PAY: "Salom! Men — For Pay agentiman. Balans, o'tkazma, seyf, kartochka va tarixni tekshirish uchun murojaat qiling.",
    BN: "Salom! Men — Bozor Narxida agentiman. Bozor narxlari, mahsulot izlash va narx-taqqoslash bo'yicha yordam beraman.",
    SUPPORT: "Assalomu alaykum! Men — Humo Support agentiman.\n\nHar qanday muammo yoki savolingizni shu chat'da yozing — jamoamiz ko'radi va javob beradi.\n\n• Odatda 4 soat ichida javob boradi\n• Bildirishnoma push xabari bilan darhol keladi\n• Suhbatlaringiz /support sahifasida tarix sifatida saqlanadi\n\nQanday yordam kerak?",
};

// Foydalanuvchi ma'lum agent bilan DM birinchi ochganda agent xabarni yuboradi.
// Faqat: (1) suhbatda hech qanday xabar yo'q, (2) qarshi tomon rasmiy tizim agenti.
// Agent xabari senderId = agent profileId bilan yoziladi (mine=false foydalanuvchi uchun).
export async function seedAgentWelcomeIfNeeded(convId: string, meId: string, otherProfileId: string): Promise<void> {
    if (otherProfileId === meId) return; // self-chat

    // Boshqa tomon rasmiy agent'mi
    const agent = await prisma.nexusAgent.findFirst({
        where: { profileId: otherProfileId, isSystem: true },
        select: { module: true },
    });
    if (!agent) return;

    // Suhbatda umuman xabar bormi
    const count = await prisma.nexusMessage.count({ where: { conversationId: convId } });
    if (count > 0) return;

    const text = WELCOME_BY_MODULE[agent.module] ?? "Salom! Men — For Humo agentiman. Sizga qanday yordam bera olaman?";
    try {
        const msg = await prisma.nexusMessage.create({
            data: {
                conversationId: convId,
                senderId: otherProfileId,   // AGENT yozadi
                text,
            },
        });
        // Suhbat lastMessage'ni ham yangilaymiz
        await prisma.nexusConversation.update({
            where: { id: convId },
            data: {
                lastMessageAt: msg.createdAt,
                lastMessageText: text,
                lastSenderId: otherProfileId,
            },
        });
    } catch (e) {
        console.error("[seedAgentWelcome]", e instanceof Error ? e.message : e);
    }
}
