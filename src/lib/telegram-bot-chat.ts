// Telegram bot chat — umumiy AI suhbat mantig'i (Humo AI mirror).
// Har bot uchun `TelegramBotChat` yozuvida oxirgi 10 turn saqlanadi.
// Direct chatda AI'ni chaqirish: Humo ID kontekstidan foydalanadi (agar link bo'lsa).

import { prisma } from "@/lib/prisma";
import { aiAvailable, aiText } from "@/lib/ai";
import { buildAiSystemPrompt } from "@/lib/ai-context-builder";
import { findLinkedProfile } from "@/lib/telegram-link";
import type { BotKey } from "@/lib/telegram-bots";

const MAX_HISTORY = 10;
const MAX_REPLY_LEN = 1800;

export interface HistoryTurn { role: "user" | "model"; text: string; at: number }

function parseHistory(raw: unknown): HistoryTurn[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((x): x is HistoryTurn => !!x && typeof x === "object"
            && (x as HistoryTurn).role !== undefined
            && typeof (x as HistoryTurn).text === "string")
        .slice(-MAX_HISTORY);
}

export async function getBotChatContext(bot: BotKey, telegramUserId: string, chatId: string): Promise<{
    profileId: string | null;
    profileName: string | null;
    history: HistoryTurn[];
}> {
    const [linked, chat] = await Promise.all([
        findLinkedProfile(telegramUserId),
        prisma.telegramBotChat.findUnique({
            where: { botKey_telegramUserId: { botKey: bot, telegramUserId } },
        }),
    ]);
    return {
        profileId: linked?.profileId ?? null,
        profileName: linked?.name ?? null,
        history: chat ? parseHistory(chat.historyJson) : [],
    };
}

export async function appendBotChatTurn(bot: BotKey, telegramUserId: string, chatId: string, profileId: string | null, turn: HistoryTurn) {
    const chat = await prisma.telegramBotChat.findUnique({
        where: { botKey_telegramUserId: { botKey: bot, telegramUserId } },
    });
    const history = chat ? parseHistory(chat.historyJson) : [];
    history.push(turn);
    const trimmed = history.slice(-MAX_HISTORY);

    await prisma.telegramBotChat.upsert({
        where: { botKey_telegramUserId: { botKey: bot, telegramUserId } },
        create: {
            botKey: bot,
            telegramUserId,
            chatId,
            profileId,
            historyJson: JSON.parse(JSON.stringify(trimmed)),
        },
        update: {
            profileId: profileId ?? undefined,
            historyJson: JSON.parse(JSON.stringify(trimmed)),
        },
    });
}

export interface BotAiReply {
    text: string;
    tokens?: number;
}

/**
 * Bot direct chat — Humo AI mirror. Universal savol → foydalanuvchi haqidagi
 * kontekst bilan javob. Agar bog'lanmagan bo'lsa oddiy generic AI javobi.
 */
export async function generateBotAiReply(opts: {
    bot: BotKey;
    userText: string;
    telegramUserId: string;
    chatId: string;
    language: "uz" | "ru" | "en";
}): Promise<BotAiReply | null> {
    if (!aiAvailable()) return null;

    const ctx = await getBotChatContext(opts.bot, opts.telegramUserId, opts.chatId);

    // Bot-specific rol
    const botRole = opts.bot === "bozor_narxida"
        ? "Sen — Bozor Narxida (BN) bot AI-yordamchisisan. bozornarxida.uz — Toshkent bozor va do'konlar marketplace'i. Foydalanuvchi mahsulot narxi, do'kon, bozor haqida so'raydi."
        : "Sen — Humo AI, For Humo super-app'ning yagona AI yordamchisisan. Belis, Nexus, Market, BN, Pay, ID kabi barcha modullar bo'yicha yordam berasan.";

    let systemPrompt = botRole + "\n\n";
    systemPrompt += opts.language === "ru"
        ? "Отвечай ТОЛЬКО по-русски.\n"
        : opts.language === "en"
        ? "Reply in English.\n"
        : "Faqat o'zbek tilida (lotin) javob ber.\n";
    systemPrompt += "- Emoji ishlatma. Uzun javob berma (max 100 so'z).\n";
    systemPrompt += "- Aniq bilmagan narsang haqida halolgina 'bilmadim' de.\n";
    systemPrompt += "- Reklama urma; ammo agar mos kelsa forhumo.uz sahifasiga yo'naltir.\n\n";

    // Foydalanuvchi konteksti (Humo ID linked bo'lsa)
    if (ctx.profileId) {
        try {
            const b = await buildAiSystemPrompt({
                profileId: ctx.profileId,
                moduleOrigin: `telegram-bot:${opts.bot}`,
                includeKnowledge: true,
                includeSignals: true,
                verboseModules: false,
                language: opts.language,
            });
            systemPrompt += "\n\n# FOYDALANUVCHI HAQIDA (Humo ID orqali ma'lum)\n" +
                b.system.split(/^#\s/m).slice(1).map(s => "# " + s).join("").slice(0, 3500);
        } catch { /* fail-safe */ }
    } else {
        systemPrompt += "\n# BOG'LANMAGAN\n" +
            "Foydalanuvchi hali Humo ID'ni Telegram'ga bog'lamagan. " +
            "Agar u shaxsiy ma'lumot so'rasa (buyurtmam, hamyonim, ...) — " +
            "'Iltimos, avval forhumo.uz/id da Humo ID'ni Telegram'ga bog'lang' deb ayting.\n";
    }

    // Suhbat tarixi (oxirgi 10)
    const historyText = ctx.history.map(h => `${h.role === "user" ? "Foydalanuvchi" : "Sen"}: ${h.text}`).join("\n");
    const fullPrompt = historyText
        ? `${historyText}\nFoydalanuvchi: ${opts.userText}\nSen:`
        : opts.userText;

    try {
        const raw = await aiText(fullPrompt, { system: systemPrompt, temperature: 0.6 });
        const text = (raw || "").trim().slice(0, MAX_REPLY_LEN);
        if (!text) return null;

        await appendBotChatTurn(opts.bot, opts.telegramUserId, opts.chatId, ctx.profileId, {
            role: "user", text: opts.userText, at: Date.now(),
        });
        await appendBotChatTurn(opts.bot, opts.telegramUserId, opts.chatId, ctx.profileId, {
            role: "model", text, at: Date.now(),
        });

        return { text };
    } catch (e) {
        console.error(`[bot-ai:${opts.bot}]`, e);
        return null;
    }
}
