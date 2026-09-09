// Humo AI Telegram Business Bot — webhook handler.
// Telegram bu URL'ga POST qiladi: business_connection, business_message, message.
//
//   POST /api/telegram/humo-bot/webhook
//     body: TgUpdate (Telegram Bot API 7.2+)
//
// Xavfsizlik: X-Telegram-Bot-Api-Secret-Token header tekshiruvi.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiAvailable, aiText } from "@/lib/ai";
import { buildAiSystemPrompt } from "@/lib/ai-context-builder";
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

const WEBHOOK_SECRET = process.env.HUMO_BOT_WEBHOOK_SECRET;

const MAX_INBOUND_LEN = 4000;
const MAX_REPLY_LEN = 1600;   // Footer + branding qo'shilganda 2000 ichida qoladi

const BOT_LEARN_URL = "https://forhumo.uz/ai/telegram-bot";

export async function POST(req: Request) {
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

    if (update.business_connection) {
        after(async () => {
            try { await handleBusinessConnection(update.business_connection!); }
            catch (e) { console.error("[humo-bot] business_connection error", e); }
        });
        return NextResponse.json({ ok: true });
    }

    if (update.business_message) {
        after(async () => {
            try { await handleBusinessMessage(update.business_message!); }
            catch (e) { console.error("[humo-bot] business_message error", e); }
        });
        return NextResponse.json({ ok: true });
    }

    if (update.message) {
        after(async () => {
            try { await handleDirectMessage(update.message!); }
            catch (e) { console.error("[humo-bot] message error", e); }
        });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
}

// ── business_connection ─────────────────────────────────────────────────────

async function handleBusinessConnection(bc: TgBusinessConnection) {
    const telegramUserId = String(bc.user.id);
    const canReply = bc.rights?.can_reply ?? true;

    await prisma.humoBotConnection.upsert({
        where: { connectionId: bc.id },
        create: {
            profileId: `pending-${telegramUserId}`,
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

    if (bc.is_enabled) {
        const lang = pickTgLang(bc.user.language_code);
        const link = `${BOT_LEARN_URL}?tg=${telegramUserId}`;
        const msg = welcomeAfterConnect(lang, telegramUserId, link);
        await sendMessage({
            chatId: bc.user_chat_id,
            text: msg,
            parseMode: "HTML",
        });
    }
}

// ── business_message (mijoz → siz) ──────────────────────────────────────────

async function handleBusinessMessage(msg: TgBusinessMessage) {
    if (!msg.text || msg.text.length === 0) return;
    if (msg.sender_business_bot) return;                       // O'z javobimizni ignore
    if (msg.from?.is_bot) return;                              // Boshqa bot bilan gaplashmaslik (loop oldini)

    const connection = await prisma.humoBotConnection.findUnique({
        where: { connectionId: msg.business_connection_id },
    });
    if (!connection) return;
    if (!connection.isEnabled || !connection.canReply) return;
    if (connection.profileId.startsWith("pending-")) return;

    const [config, sub, profile] = await Promise.all([
        prisma.humoBotConfig.findUnique({ where: { profileId: connection.profileId } }),
        prisma.humoBotSubscription.findUnique({ where: { profileId: connection.profileId } }),
        prisma.userProfile.findUnique({
            where: { id: connection.profileId },
            select: { name: true, username: true },
        }),
    ]);
    if (!config || !config.autoReplyEnabled) return;

    // Obuna tekshiruvi
    const tier = sub?.tier ?? "free";
    const monthlyLimit = sub?.monthlyLimit ?? 50;
    const used = sub?.usedThisMonth ?? 0;
    if (used >= monthlyLimit) return;
    if (sub?.status === "expired" || sub?.status === "cancelled") return;
    if (sub?.expiresAt && sub.expiresAt.getTime() < Date.now()) return;

    // Ish vaqti tekshiruvi
    const now = new Date();
    if (config.workHours && !isInWorkHours(config.workHours, now)) {
        if (config.outOfHoursReply) {
            const withBrand = decorateReply({
                reply: config.outOfHoursReply,
                tier,
                showBranding: config.showBranding,
                showAdFooter: config.showAdFooter,
                ownerName: profile?.name ?? "Ega",
                language: config.language === "auto" ? "uz" : (config.language as "uz" | "ru" | "en"),
            });
            await sendBusinessMessage({
                businessConnectionId: msg.business_connection_id,
                chatId: msg.chat.id,
                text: withBrand,
                replyToMessageId: msg.message_id,
                parseMode: "HTML",
            });
        }
        return;
    }

    void sendBusinessChatAction({
        businessConnectionId: msg.business_connection_id,
        chatId: msg.chat.id,
    });

    // Kontekst: bu chatda oldingi javob berganmizmi (salom takrorlamaslik uchun)
    const previousInThisChat = await prisma.humoBotMessage.count({
        where: {
            profileId: connection.profileId,
            chatId: String(msg.chat.id),
            wasAutoReplied: true,
            createdAt: { gte: hoursAgo(24) },
        },
    });
    const isFirstContact = previousInThisChat === 0;

    // Mijoz tili
    const detectedLang = detectLang(msg.text);
    const configLang = (config.language ?? "uz") as "uz" | "ru" | "en" | "auto";
    const replyLang: "uz" | "ru" | "en" = configLang === "auto"
        ? detectedLang
        : (configLang === "uz" || configLang === "ru" || configLang === "en" ? configLang : "uz");

    const inbound = msg.text.slice(0, MAX_INBOUND_LEN);
    const customerName = msg.from
        ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ")
        : "Mijoz";

    let aiReply: string | null = null;
    const startedAt = Date.now();

    // 1) FAQ tez javob
    const faq = parseFaq(config.faqJson);
    const faqHit = matchFaq(faq, inbound);
    if (faqHit) {
        aiReply = faqHit.a;
    } else if (aiAvailable()) {
        // 2) AI — Business Mode system prompt + ega'ning For Humo konteksti
        const businessPrompt = buildBusinessPrompt({
            persona: config.persona,
            tone: config.tone,
            language: replyLang,
            faq,
            greeting: config.greeting,
            bannedTopics: config.bannedTopics,
            escalationRules: config.escalationRules,
            ownerName: profile?.name ?? null,
            isFirstContact,
            customerName,
        });
        // Ega'ning For Humo ma'lumotlarini (Belis, Market, BN, Nexus...) qo'shamiz
        let ownerContext = "";
        try {
            const ctx = await buildAiSystemPrompt({
                profileId: connection.profileId,
                moduleOrigin: "telegram-bot",
                includeKnowledge: true,
                includeSignals: true,
                verboseModules: false,
                language: replyLang,
            });
            // Faqat qisqacha profil + bilim va signallarni qoldiramiz (Humo AI o'zining rol qismini olib tashlaymiz)
            ownerContext = "\n\n# EGA HAQIDA MA'LUMOTLAR (mijoz so'rasa yordam bering)\n" +
                ctx.system.split(/^#\s/m).slice(1).map(s => "# " + s).join("").slice(0, 4000);
        } catch { /* fail-safe */ }

        const systemPrompt = businessPrompt + ownerContext;
        try {
            const raw = await aiText(inbound, { system: systemPrompt, temperature: 0.5 });
            aiReply = (raw || "").trim().slice(0, MAX_REPLY_LEN);
        } catch (e) {
            console.error("[humo-bot] AI xato", e);
        }
    }

    let sentMsgId: number | null = null;
    let errorMessage: string | null = null;
    if (aiReply && aiReply.length > 0) {
        const decorated = decorateReply({
            reply: aiReply,
            tier,
            showBranding: config.showBranding,
            showAdFooter: config.showAdFooter,
            ownerName: profile?.name ?? "Ega",
            language: replyLang,
        });
        const send = await sendBusinessMessage({
            businessConnectionId: msg.business_connection_id,
            chatId: msg.chat.id,
            text: decorated,
            replyToMessageId: msg.message_id,
            parseMode: "HTML",
        });
        if (send.ok && send.result) {
            sentMsgId = send.result.message_id;
        } else {
            errorMessage = send.description ?? "unknown";
        }
    }

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

// ── direct chat (bot bilan gaplashish) ──────────────────────────────────────

async function handleDirectMessage(msg: TgBusinessMessage) {
    if (!msg.text) return;
    const text = msg.text.trim();
    const lang = pickTgLang(msg.from?.language_code);

    if (text === "/start" || text.startsWith("/start ")) {
        // Deep-link /start payload (masalan /start learn) — batafsil ko'rsatma
        const payload = text.slice("/start".length).trim();
        if (payload === "learn") {
            await sendMessage({
                chatId: msg.chat.id,
                text: helpSetupText(lang),
                parseMode: "HTML",
            });
            return;
        }
        await sendMessage({
            chatId: msg.chat.id,
            text: startText(lang),
            parseMode: "HTML",
        });
        return;
    }

    if (text === "/help") {
        await sendMessage({
            chatId: msg.chat.id,
            text: helpSetupText(lang),
            parseMode: "HTML",
        });
        return;
    }
    if (text === "/settings") {
        await sendMessage({
            chatId: msg.chat.id,
            text: settingsText(lang),
            parseMode: "HTML",
        });
        return;
    }
    if (text === "/pricing" || text === "/plans") {
        await sendMessage({
            chatId: msg.chat.id,
            text: pricingText(lang),
            parseMode: "HTML",
        });
        return;
    }

    // Aks holda — foydalanuvchi bot chatida yozdi, umumiy ma'lumot
    await sendMessage({
        chatId: msg.chat.id,
        text: startText(lang),
        parseMode: "HTML",
    });
}

// ── Yordamchi funksiyalar ───────────────────────────────────────────────────

interface FaqItem { q: string; a: string }
function parseFaq(raw: unknown): FaqItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is FaqItem =>
        !!x && typeof x === "object"
        && typeof (x as FaqItem).q === "string"
        && typeof (x as FaqItem).a === "string"
    ).slice(0, 30);
}

function matchFaq(faq: FaqItem[], text: string): FaqItem | null {
    const t = text.toLowerCase();
    for (const f of faq) {
        const q = f.q.toLowerCase();
        if (q.length < 4) continue;
        // 4 belgidan uzun prefixni tekshiramiz
        const head = q.slice(0, Math.min(q.length, 24));
        if (t.includes(head)) return f;
    }
    return null;
}

function isInWorkHours(workHours: string, now: Date): boolean {
    const match = workHours.match(/(\d{1,2}):?(\d{2})?\s*[-–]\s*(\d{1,2}):?(\d{2})?/);
    if (!match) return true;
    const startH = parseInt(match[1]);
    const endH = parseInt(match[3]);
    const h = now.getHours();
    return h >= startH && h < endH;
}

function hoursAgo(n: number): Date {
    return new Date(Date.now() - n * 60 * 60 * 1000);
}

/**
 * Til aniqlash: kirillik → ru, boshqa → uz (default), ingliz belgilar ko'p → en.
 * Oddiy heuristika (Gemini-ni sarflamasdan).
 */
function detectLang(text: string): "uz" | "ru" | "en" {
    const cyr = (text.match(/[Ѐ-ӿ]/g) || []).length;
    const lat = (text.match(/[A-Za-z]/g) || []).length;
    if (cyr > lat) return "ru";
    // O'zbekcha ko'rsatkichlar: sh/ch/o'/g'/ng/uz-specific words
    if (/\b(salom|assalomu|xayrli|iltimos|rahmat|men|siz)\b/i.test(text)) return "uz";
    if (/\b(hello|hi|hey|please|thanks|thank you|what|how|when|where)\b/i.test(text)) return "en";
    return "uz";
}

function pickTgLang(code: string | undefined | null): "uz" | "ru" | "en" {
    if (!code) return "uz";
    const c = code.slice(0, 2).toLowerCase();
    if (c === "ru") return "ru";
    if (c === "en") return "en";
    if (c === "uz") return "uz";
    return "en";   // Boshqa tillar uchun ingliz zaxira
}

// ── Business Mode system prompt ─────────────────────────────────────────────
// MUHIM: AI o'zining identitysini xabar boshida yozmasligi kerak — decorator qo'yadi.
// AI faqat mijoz savoliga toza mazmun bilan javob beradi.

function buildBusinessPrompt(cfg: {
    persona?: string | null;
    tone?: string;
    language: "uz" | "ru" | "en";
    faq: FaqItem[];
    greeting?: string | null;
    bannedTopics?: string | null;
    escalationRules?: string | null;
    ownerName?: string | null;
    isFirstContact: boolean;
    customerName: string;
}): string {
    const owner = cfg.ownerName ?? "biznes egasi";
    const langInstruction = cfg.language === "ru"
        ? "ОТВЕЧАЙ ТОЛЬКО ПО-РУССКИ (кириллица)."
        : cfg.language === "en"
        ? "ALWAYS reply in English."
        : "FAQAT O'ZBEK TILIDA (lotin yozuvida) javob ber.";

    const parts: string[] = [];

    parts.push(`# ROL`);
    parts.push(`Sen — ${owner} nomidan Telegram Business chat'ida ishlaydigan avtomatik AI yordamchisisan.`);
    parts.push(`SEN ${owner.toUpperCase()} EMASSAN. Sen uning AI yordamchisisan.`);
    parts.push("");

    parts.push(`# TIL`);
    parts.push(langInstruction);
    parts.push("");

    parts.push(`# QAT'IY TAQIQ (Doim'ni buzsang xato hisoblanadi)`);
    parts.push(`1. HECH QACHON "Men ${owner}ning AI yordamchisiman", "Men AI yordamchiman", "Mening ismim..." kabi identity gapni YOZMA. Identity avtomatik ravishda tizim tomonidan qo'yiladi.`);
    parts.push(`2. HECH QACHON o'zingni tanishtirma. Faqat mijoz savoliga MAZMUNLI javob ber.`);
    parts.push(`3. Javobni birdan ma'noli mazmun bilan boshla — "Assalomu alaykum" yoki tanishuv gap YOZMA.`);
    if (cfg.isFirstContact) {
        parts.push(`4. Bu chatda 1-marta gaplashsang ham salomlashuvni YOZMA (avtomatik qo'yiladi).`);
    } else {
        parts.push(`4. Bu chatda avval gaplashilgan — "salom", "assalomu alaykum" umuman YOZMA.`);
    }
    parts.push(`5. Reklama urma, marketing gaplar QO'SHMA.`);
    parts.push("");

    parts.push(`# JAVOB USLUBI`);
    if (cfg.tone === "friendly") parts.push(`Ton: samimiy, do'stona, iliq (lekin qisqa).`);
    else if (cfg.tone === "brief") parts.push(`Ton: juda qisqa (1-2 gap), aniq, minimal.`);
    else parts.push(`Ton: professional, xushmuomala, ishonchli.`);
    parts.push(`Max 80 so'z (mijoz batafsil so'ramasa 40 so'z ichida qol).`);
    parts.push(`Emoji ishlatma.`);
    parts.push("");

    parts.push(`# BIZNES`);
    if (cfg.persona) parts.push(`${cfg.persona}`);
    else parts.push(`Biznes tavsifi hali kiritilmagan. Umumiy javob ber; konkret narx/detal so'rasa "menda hozircha aniq ma'lumot yo'q, ega o'zi javob beradi" degin.`);
    if (cfg.greeting) parts.push(`Ega xabari (kontekst): "${cfg.greeting}"`);
    parts.push("");

    parts.push(`# QOIDALAR`);
    parts.push(`- Bilmagan narsangda: "Bu haqda aniq ma'lumot yo'q, ega o'zi javob beradi" (o'zbekcha yoki mos tilda).`);
    parts.push(`- Narx, aloqa, manzilni FAQAT FAQ'da yozilgan bo'lsagina ayt.`);
    parts.push(`- Shikoyat/murakkab so'rov: "So'rovni egaga uzatdim, tez orada javob beradi".`);
    parts.push(`- Sen kimsan so'rasa: "Men avtomatik AI yordamchiman" (qisqa, tabiiy).`);
    if (cfg.bannedTopics) parts.push(`- Taqiq mavzular (javob berma): ${cfg.bannedTopics}`);
    if (cfg.escalationRules) parts.push(`- Eskalatsiya qoidalari: ${cfg.escalationRules}`);
    parts.push("");

    if (cfg.faq.length > 0) {
        parts.push(`# FAQ (mos kelsa aynan javobni ishlat)`);
        cfg.faq.slice(0, 20).forEach((f, i) => {
            parts.push(`${i + 1}. S: ${f.q}\n   J: ${f.a}`);
        });
    }

    return parts.join("\n");
}

// ── Reply bezash (branding + marketing footer) ──────────────────────────────

const AD_HEADLINES = {
    uz: [
        "Bu javobni AI berdi. Sizniki ham 24/7 javob berishi mumkin →",
        "Uxlab yotganingizda ham mijozlarga javob bering →",
        "Mijozlar kutayapti? AI 3 soniyada javob beradi →",
        "Sizning Business chat'ingizda ham shunday AI ishlasin →",
        "Bu bot 60+ soatlik ish vaqtingizni tejaydi. Ulash →",
    ],
    ru: [
        "Этот ответ дал AI. Такой же для вашего Business — 24/7 →",
        "Пока вы спите — AI отвечает клиентам за вас →",
        "Клиенты ждут ответа? AI отвечает за 3 секунды →",
        "Подключите такого же AI-ассистента к вашему Business →",
        "Экономит 60+ часов работы в месяц. Подключить →",
    ],
    en: [
        "This reply is by AI. Get one for your Business — 24/7 →",
        "AI replies to your customers while you sleep →",
        "Customers waiting? AI replies in 3 seconds →",
        "Connect the same AI to your Telegram Business →",
        "Saves 60+ hours a month. Try it →",
    ],
} as const;

function decorateReply(opts: {
    reply: string;
    tier: string;
    showBranding: boolean;
    showAdFooter: boolean;
    ownerName: string;
    language: "uz" | "ru" | "en";
}): string {
    let out = opts.reply.trim();

    // Bir necha AI o'z-o'zidan yozadigan tanishuv gaplarni tozalash
    out = stripSelfIntro(out, opts.ownerName);

    const canRemoveBranding = opts.tier === "enterprise" || opts.tier === "enterprise_yearly";
    const canRemoveFooter = opts.tier === "pro" || opts.tier === "pro_yearly"
        || opts.tier === "enterprise" || opts.tier === "enterprise_yearly";

    // 1) Intro (identity chizig'i) — har javobga qo'shiladi
    const brandName = (canRemoveBranding && !opts.showBranding)
        ? "AI"
        : `<a href="${BOT_LEARN_URL}">Humo AI</a>`;
    const introLine = introFor(opts.language, opts.ownerName, brandName);
    out = introLine + "\n\n" + out;

    // 2) Marketing footer (reklama)
    const footerAllowedRemoved = canRemoveFooter && !opts.showAdFooter;
    if (!footerAllowedRemoved) {
        const headline = pickHeadline(opts.language);
        out += `\n\n<i>— ${headline} <a href="https://t.me/ForHumo_AIBot?start=learn">Humo AI</a></i>`;
    }

    return out;
}

function introFor(lang: "uz" | "ru" | "en", owner: string, brandLink: string): string {
    const safe = escapeHtml(owner);
    if (lang === "ru") return `<i>Я — персональный ${brandLink} ассистент ${safe}.</i>`;
    if (lang === "en") return `<i>I'm ${safe}'s personal ${brandLink} assistant.</i>`;
    return `<i>Men ${safe}ning shaxsiy ${brandLink} yordamchisiman.</i>`;
}

function pickHeadline(lang: "uz" | "ru" | "en"): string {
    const list = AD_HEADLINES[lang] ?? AD_HEADLINES.uz;
    // Kunga qarab aylanadi — bir kun ichida ko'p mijozga bir xil ko'rinadi (natural)
    const dayIdx = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % list.length;
    return list[dayIdx];
}

/**
 * AI ba'zida o'zi tanishuv gapi bilan boshlaydi — biz uni olib tashlaymiz
 * (decorator kerakli intro'ni qo'yadi).
 */
function stripSelfIntro(text: string, ownerName: string): string {
    const owner = ownerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns: RegExp[] = [
        new RegExp(`^\\s*(?:Assalomu\\s+alaykum[,.!]?\\s*)?Men\\s+${owner}(?:['ʼ]?ning|ning)?[^\\n]*yordamchi[a-z]*[^\\n]*(?:\\n|$)`, "i"),
        /^\s*Assalomu\s+alaykum[,.!]?\s*(?:\n|$)/i,
        /^\s*Здравствуйте[,.!]?\s*(?:\n|$)/i,
        /^\s*Hello[,.!]?\s*(?:\n|$)/i,
        /^\s*Я\s*—?\s*(?:личный|персональный)?[^\n]*помощник[^\n]*(?:\n|$)/i,
        /^\s*I['ʼ]?m\s+[^\n]*assistant[^\n]*(?:\n|$)/i,
    ];
    let out = text;
    for (const p of patterns) {
        const before = out;
        out = out.replace(p, "").trimStart();
        if (before !== out) break;   // Bir marta tozalash yetadi
    }
    return out;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Direct chat matnlari ────────────────────────────────────────────────────

function welcomeAfterConnect(lang: "uz" | "ru" | "en", tgId: string, link: string): string {
    if (lang === "ru") {
        return `Добро пожаловать! Я — <b>Humo AI</b>, автоматический ассистент вашего Telegram Business.\n\nЧтобы настроить (persona, FAQ, часы работы):\n${link}\n\nВаш Telegram ID: <code>${tgId}</code>`;
    }
    if (lang === "en") {
        return `Welcome! I'm <b>Humo AI</b> — an automated assistant for your Telegram Business account.\n\nSet me up (persona, FAQ, working hours):\n${link}\n\nYour Telegram ID: <code>${tgId}</code>`;
    }
    return `Xush kelibsiz! Men <b>Humo AI</b> — Telegram Business akkauntingizni avtomatik yordamchisi.\n\nMeni sozlash uchun (persona, FAQ, ish vaqti):\n${link}\n\nSizning Telegram ID: <code>${tgId}</code>`;
}

function startText(lang: "uz" | "ru" | "en"): string {
    if (lang === "ru") {
        return `Привет! Я <b>Humo AI</b> — AI-ассистент для Telegram Business.\n\nЯ отвечаю клиентам от вашего имени, когда вы заняты или спите.\n\n<b>Что я умею:</b>\n• Отвечать на вопросы клиентов 24/7\n• Использовать вашу FAQ базу\n• Работать по расписанию\n• Говорить в вашем стиле (persona)\n\n<b>Команды:</b>\n/help — как подключить\n/settings — настройка\n/pricing — тарифы\n\nПодробнее: https://forhumo.uz/ai/telegram-bot`;
    }
    if (lang === "en") {
        return `Hi! I'm <b>Humo AI</b> — AI assistant for Telegram Business.\n\nI reply to your customers on your behalf when you're busy or asleep.\n\n<b>What I do:</b>\n• Answer customer questions 24/7\n• Use your FAQ knowledge base\n• Follow your working hours\n• Talk in your style (persona)\n\n<b>Commands:</b>\n/help — how to connect\n/settings — configure\n/pricing — plans\n\nLearn more: https://forhumo.uz/ai/telegram-bot`;
    }
    return `Salom! Men <b>Humo AI</b> — Telegram Business uchun AI yordamchi.\n\nSiz band bo'lganingiz yoki uxlab yotganingizda mijozlaringizga sizning nomingizdan javob beraman.\n\n<b>Nimalar qila olaman:</b>\n• Mijoz savollariga 24/7 javob\n• Sizning FAQ bazangizdan foydalanish\n• Ish vaqtingizga rioya qilish\n• Sizning uslubingizda gapirish (persona)\n\n<b>Buyruqlar:</b>\n/help — qanday ulash\n/settings — sozlash\n/pricing — tariflar\n\nBatafsil: https://forhumo.uz/ai/telegram-bot`;
}

function helpSetupText(lang: "uz" | "ru" | "en"): string {
    if (lang === "ru") {
        return `<b>Как подключить Humo AI:</b>\n\n<b>Требования:</b> Telegram Premium или Business подписка.\n\n<b>Шаг 1.</b> Откройте: Настройки → Telegram Business → <b>Чаты и автоматизация</b>.\n\n<b>Шаг 2.</b> Нажмите <b>Управлять</b> и введите имя бота:\n<code>@ForHumo_AIBot</code>\n\n<b>Шаг 3.</b> Выдайте боту право <b>Отвечать на сообщения</b>.\n\n<b>Шаг 4.</b> Я пришлю ваш Telegram ID. Скопируйте его и откройте:\nhttps://forhumo.uz/ai/telegram-bot\n\nВойдите через Humo ID, вставьте ID и нажмите «Связать». Далее настройте persona, FAQ и часы работы.`;
    }
    if (lang === "en") {
        return `<b>How to connect Humo AI:</b>\n\n<b>Requirements:</b> Telegram Premium or Business subscription.\n\n<b>Step 1.</b> Open: Settings → Telegram Business → <b>Chatbots</b>.\n\n<b>Step 2.</b> Tap <b>Manage</b> and enter the bot username:\n<code>@ForHumo_AIBot</code>\n\n<b>Step 3.</b> Grant the <b>Reply to messages</b> right.\n\n<b>Step 4.</b> I'll send you your Telegram ID. Copy it and open:\nhttps://forhumo.uz/ai/telegram-bot\n\nLog in via Humo ID, paste the ID and tap "Link". Then configure persona, FAQ and working hours.`;
    }
    return `<b>Humo AI'ni qanday ulash:</b>\n\n<b>Talab:</b> Telegram Premium yoki Business obuna.\n\n<b>1-qadam.</b> Oching: Sozlamalar → Telegram Business → <b>Автоматизация чатов</b>.\n\n<b>2-qadam.</b> <b>Boshqarish</b>ga bosing va bot nomini kiriting:\n<code>@ForHumo_AIBot</code>\n\n<b>3-qadam.</b> Botga <b>Xabarlarga javob berish</b> huquqini bering.\n\n<b>4-qadam.</b> Men sizga Telegram ID yuboraman. Uni nusxa oling va oching:\nhttps://forhumo.uz/ai/telegram-bot\n\nHumo ID orqali kiring, ID'ni joylashtiring va «Bog'lash»ga bosing. Keyin persona, FAQ va ish vaqtini sozlang.`;
}

function settingsText(lang: "uz" | "ru" | "en"): string {
    if (lang === "ru") return `Настройки бота — на сайте:\nhttps://forhumo.uz/ai/telegram-bot`;
    if (lang === "en") return `Bot settings on the website:\nhttps://forhumo.uz/ai/telegram-bot`;
    return `Bot sozlamalari saytda:\nhttps://forhumo.uz/ai/telegram-bot`;
}

function pricingText(lang: "uz" | "ru" | "en"): string {
    if (lang === "ru") {
        return `<b>Тарифы Humo AI:</b>\n\n• <b>Бесплатно</b> — 50 сообщ/мес\n• <b>Basic</b> — 500 сообщ/мес · 29 000 сум\n• <b>Pro</b> — 3 000 сообщ/мес · 99 000 сум\n• <b>Enterprise</b> — 30 000 сообщ/мес · 299 000 сум\n\nГодовые тарифы дешевле: Basic −10%, Pro −15%, Enterprise −20%.\n\nОплата только через For Pay кошелёк:\nhttps://forhumo.uz/ai/telegram-bot`;
    }
    if (lang === "en") {
        return `<b>Humo AI plans:</b>\n\n• <b>Free</b> — 50 messages/mo\n• <b>Basic</b> — 500 msg/mo · 29 000 UZS\n• <b>Pro</b> — 3 000 msg/mo · 99 000 UZS\n• <b>Enterprise</b> — 30 000 msg/mo · 299 000 UZS\n\nYearly is cheaper: Basic −10%, Pro −15%, Enterprise −20%.\n\nPayment only via For Pay wallet:\nhttps://forhumo.uz/ai/telegram-bot`;
    }
    return `<b>Humo AI tariflari:</b>\n\n• <b>Bepul</b> — 50 xabar/oy\n• <b>Basic</b> — 500 xabar/oy · 29 000 so'm\n• <b>Pro</b> — 3 000 xabar/oy · 99 000 so'm\n• <b>Enterprise</b> — 30 000 xabar/oy · 299 000 so'm\n\nYillik tarif arzon: Basic −10%, Pro −15%, Enterprise −20%.\n\nTo'lov faqat For Pay hamyoni orqali:\nhttps://forhumo.uz/ai/telegram-bot`;
}
