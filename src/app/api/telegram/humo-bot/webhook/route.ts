// Humo AI Telegram Business Bot — webhook handler.
// Telegram bu URL'ga POST qiladi: business_connection, business_message, message.
//
//   POST /api/telegram/humo-bot/webhook
//     body: TgUpdate (Telegram Bot API 7.2+)
//
// Xavfsizlik: X-Telegram-Bot-Api-Secret-Token header tekshiruvi.

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiAvailable, aiText } from "@/lib/ai";
import {
    sendBusinessMessage,
    sendMessage,
    sendBusinessChatAction,
    type TgUpdate,
    type TgBusinessMessage,
    type TgBusinessConnection,
} from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const WEBHOOK_SECRET = process.env.HUMO_BOT_WEBHOOK_SECRET; // ixtiyoriy: set qilinsa header talab qilinadi

const MAX_INBOUND_LEN = 4000;
const MAX_REPLY_LEN = 2000;

export async function POST(req: Request) {
    // Xavfsizlik: agar secret token o'rnatilgan bo'lsa header'da tekshiramiz
    if (WEBHOOK_SECRET) {
        const provided = req.headers.get("x-telegram-bot-api-secret-token");
        if (provided !== WEBHOOK_SECRET) {
            return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
    }

    let update: TgUpdate;
    try {
        update = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    // Business ulanish o'zgarishi (yoqildi/o'chirildi/huquq o'zgardi)
    if (update.business_connection) {
        await handleBusinessConnection(update.business_connection);
        return NextResponse.json({ ok: true });
    }

    // Business chat'da yangi xabar → AI javob
    if (update.business_message) {
        // Javobni tez qaytaramiz, AI'ni fon rejimda ishga tushiramiz
        after(async () => {
            try {
                await handleBusinessMessage(update.business_message!);
            } catch (e) {
                console.error("[humo-bot] business_message error", e);
            }
        });
        return NextResponse.json({ ok: true });
    }

    // Oddiy bot chat (Business egasi bot bilan sozlash chatida gaplashadi)
    if (update.message) {
        after(async () => {
            try {
                await handleDirectMessage(update.message!);
            } catch (e) {
                console.error("[humo-bot] message error", e);
            }
        });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleBusinessConnection(bc: TgBusinessConnection) {
    // Foydalanuvchi bot'ni Business akkauntga ulaganda yoki o'zgartirganda kelan
    const telegramUserId = String(bc.user.id);
    const canReply = bc.rights?.can_reply ?? true;

    // Bu Telegram user'ni For Humo profil bilan bog'lash uchun user'ning username kerak
    // Yoki foydalanuvchi bot bilan sozlash paytida o'z Humo ID'sini yuborishi
    // Hozircha telegramUserId ni saqlaymiz, keyin foydalanuvchi web'da bog'laydi

    await prisma.humoBotConnection.upsert({
        where: { connectionId: bc.id },
        create: {
            profileId: `pending-${telegramUserId}`,               // Placeholder — foydalanuvchi web'da bog'laydi
            telegramUserId,
            telegramUsername: bc.user.username ?? null,
            connectionId: bc.id,
            isEnabled: bc.is_enabled,
            canReply,
        },
        update: {
            isEnabled: bc.is_enabled,
            canReply,
            telegramUsername: bc.user.username ?? null,
            disconnectedAt: bc.is_enabled ? null : new Date(),
        },
    });

    // Foydalanuvchiga sozlash uchun link yuboramiz
    if (bc.is_enabled) {
        const link = `https://forhumo.uz/ai/telegram-bot?tg=${telegramUserId}`;
        await sendMessage({
            chatId: bc.user_chat_id,
            text: `👋 Humo AI botiga xush kelibsiz!\n\nBotni sozlash uchun:\n${link}\n\nSizning Telegram ID: <code>${telegramUserId}</code>\n\nWeb'da Humo ID orqali kirib, personani, FAQ va ish vaqtini sozlang.`,
            parseMode: "HTML",
        });
    }
}

async function handleBusinessMessage(msg: TgBusinessMessage) {
    if (!msg.text || msg.text.length === 0) return;
    if (msg.sender_business_bot) return;  // O'z javobimizni ignore qilamiz (loop oldini)

    const connection = await prisma.humoBotConnection.findUnique({
        where: { connectionId: msg.business_connection_id },
    });
    if (!connection) {
        console.warn("[humo-bot] connection topilmadi:", msg.business_connection_id);
        return;
    }
    if (!connection.isEnabled || !connection.canReply) return;

    // Foydalanuvchi bog'lanmagan bo'lsa (pending)
    if (connection.profileId.startsWith("pending-")) {
        // Sozlash tugaguncha AI javob bermaymiz
        return;
    }

    // Sozlash va obuna tekshirish
    const [config, sub, profile] = await Promise.all([
        prisma.humoBotConfig.findUnique({ where: { profileId: connection.profileId } }),
        prisma.humoBotSubscription.findUnique({ where: { profileId: connection.profileId } }),
        prisma.userProfile.findUnique({
            where: { id: connection.profileId },
            select: { name: true, username: true },
        }),
    ]);

    if (!config || !config.autoReplyEnabled) return;

    // Rate limit / obuna tekshiruvi
    const tier = sub?.tier ?? "free";
    const limit = sub?.monthlyLimit ?? 50;
    const used = sub?.usedThisMonth ?? 0;
    if (used >= limit) {
        console.log(`[humo-bot] ${connection.profileId} monthly limit yetdi (${used}/${limit})`);
        return;
    }
    if (sub?.status === "expired" || sub?.status === "cancelled") return;

    // Ish vaqti tekshiruvi (ixtiyoriy)
    const now = new Date();
    if (config.workHours && !isInWorkHours(config.workHours, now)) {
        if (config.outOfHoursReply) {
            await sendBusinessMessage({
                businessConnectionId: msg.business_connection_id,
                chatId: msg.chat.id,
                text: config.outOfHoursReply,
                replyToMessageId: msg.message_id,
            });
        }
        return;
    }

    // Typing indicator
    void sendBusinessChatAction({
        businessConnectionId: msg.business_connection_id,
        chatId: msg.chat.id,
    });

    // FAQ dan qidiruv (tez javob)
    const inbound = msg.text.slice(0, MAX_INBOUND_LEN);
    const customerName = msg.from ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") : "Mijoz";

    let aiReply: string | null = null;
    const startedAt = Date.now();

    // FAQ eng oddiy: keyword match
    const faq = parseFaq(config.faqJson);
    const faqHit = faq.find(f => {
        const q = f.q.toLowerCase();
        const text = inbound.toLowerCase();
        return q.length > 3 && text.includes(q.slice(0, Math.min(q.length, 20)));
    });
    if (faqHit) {
        aiReply = faqHit.a;
    } else if (aiAvailable()) {
        // AI bilan javob
        const systemPrompt = buildSystemPrompt({
            persona: config.persona,
            tone: config.tone,
            language: config.language,
            faq,
            greeting: config.greeting,
            bannedTopics: config.bannedTopics,
            escalationRules: config.escalationRules,
            ownerName: profile?.name ?? null,
        });
        try {
            const raw = await aiText(inbound, { system: systemPrompt, temperature: 0.6 });
            aiReply = (raw || "").trim().slice(0, MAX_REPLY_LEN);
        } catch (e) {
            console.error("[humo-bot] AI xato", e);
        }
    }

    let sentMsgId: number | null = null;
    let errorMessage: string | null = null;
    if (aiReply && aiReply.length > 0) {
        const send = await sendBusinessMessage({
            businessConnectionId: msg.business_connection_id,
            chatId: msg.chat.id,
            text: aiReply,
            replyToMessageId: msg.message_id,
        });
        if (send.ok && send.result) {
            sentMsgId = send.result.message_id;
        } else {
            errorMessage = send.description ?? "unknown";
        }
    }

    // Log yozish + usage counter
    await Promise.all([
        prisma.humoBotMessage.create({
            data: {
                profileId: connection.profileId,
                connectionId: msg.business_connection_id,
                chatId: String(msg.chat.id),
                messageId: String(msg.message_id),
                fromCustomerName: customerName,
                customerText: inbound,
                aiReplyText: aiReply,
                aiReplyMessageId: sentMsgId ? String(sentMsgId) : null,
                wasAutoReplied: !!sentMsgId,
                latencyMs: Date.now() - startedAt,
                errorMessage,
            },
        }),
        sentMsgId ? prisma.humoBotSubscription.upsert({
            where: { profileId: connection.profileId },
            create: { profileId: connection.profileId, usedThisMonth: 1 },
            update: { usedThisMonth: { increment: 1 } },
        }) : Promise.resolve(),
    ]);
}

async function handleDirectMessage(msg: TgBusinessMessage) {
    // Foydalanuvchi bot bilan direct chatda gaplashsa (masalan /start)
    if (!msg.text) return;
    const text = msg.text.trim();

    if (text === "/start" || text.startsWith("/start")) {
        await sendMessage({
            chatId: msg.chat.id,
            text: `👋 Salom! Men Humo AI botman.\n\nMening asosiy vazifam — sizning Telegram Business akkauntingizda mijoz xabarlarga sizning nomingizdan avtomatik javob berish.\n\n<b>Sozlash bosqichlari:</b>\n1️⃣ Telegram Premium/Business obuna bo'ling\n2️⃣ Sozlamalar → Автоматизация чатов → @ForHumo_AIBot ulang\n3️⃣ Web'ga kiring: https://forhumo.uz/ai/telegram-bot\n4️⃣ Persona, FAQ va ish vaqtini sozlang\n\nSavolingiz bo'lsa yozing yoki https://forhumo.uz/support ga murojaat qiling.`,
            parseMode: "HTML",
        });
        return;
    }

    if (text === "/help") {
        await sendMessage({
            chatId: msg.chat.id,
            text: `<b>Buyruqlar:</b>\n/start — boshlash\n/help — yordam\n/status — obuna holati\n\nBotni sozlash: https://forhumo.uz/ai/telegram-bot`,
            parseMode: "HTML",
        });
        return;
    }
}

// ── Yordamchi funksiyalar ───────────────────────────────────────────────────

interface FaqItem { q: string; a: string }
function parseFaq(raw: unknown): FaqItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is FaqItem =>
        !!x && typeof x === "object" && typeof (x as FaqItem).q === "string" && typeof (x as FaqItem).a === "string"
    ).slice(0, 30);
}

function isInWorkHours(workHours: string, now: Date): boolean {
    // Oddiy format: "Du-Ju 09:00-18:00" — chegaralarni ochish
    // Hozir soddalashtirilgan: 9-18 kabi range
    const match = workHours.match(/(\d{1,2}):?(\d{2})?\s*[-–]\s*(\d{1,2}):?(\d{2})?/);
    if (!match) return true;
    const startH = parseInt(match[1]);
    const endH = parseInt(match[3]);
    const h = now.getHours();
    return h >= startH && h < endH;
}

function buildSystemPrompt(cfg: {
    persona?: string | null;
    tone?: string;
    language?: string;
    faq: FaqItem[];
    greeting?: string | null;
    bannedTopics?: string | null;
    escalationRules?: string | null;
    ownerName?: string | null;
}): string {
    const lang = cfg.language === "ru" ? "rus" : cfg.language === "en" ? "ingliz" : "o'zbek";
    const parts: string[] = [];
    parts.push(`Sen ${cfg.ownerName ?? "biznes egasi"} nomidan Telegram chat'da avtomatik javob beradigan AI yordamchisan.`);
    parts.push(`Til: ${lang} tilida javob ber.`);
    if (cfg.persona) parts.push(`Biznes: ${cfg.persona}`);
    if (cfg.tone === "friendly") parts.push("Ton: samimiy, do'stona.");
    else if (cfg.tone === "brief") parts.push("Ton: qisqa va aniq (1-2 gap).");
    else parts.push("Ton: professional va xushmuomala.");
    parts.push("Qoidalar:");
    parts.push("- Faqat berilgan biznes doirasida javob ber.");
    parts.push("- Bilmagan narsang haqida 'menda bu ma'lumot yo'q, egasi javob beradi' de.");
    parts.push("- Uzun javob berma (max 200 so'z).");
    parts.push("- Narx, aloqa yoki muhim ma'lumotni faqat FAQ'da bergan bo'lsa ayt.");
    if (cfg.bannedTopics) parts.push(`Taqiq mavzular: ${cfg.bannedTopics}`);
    if (cfg.escalationRules) parts.push(`Eskalatsiya: ${cfg.escalationRules}`);
    if (cfg.faq.length > 0) {
        parts.push("\nFAQ (foydalanuvchi savoli bunga mos kelsa aynan javobni ber):");
        cfg.faq.slice(0, 20).forEach((f, i) => {
            parts.push(`${i + 1}. S: ${f.q}\n   J: ${f.a}`);
        });
    }
    return parts.join("\n");
}
