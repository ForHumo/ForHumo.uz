// Umumiy Telegram bot handler — "generic" botlar uchun:
//   forhumo, humo_id, nexus, esport, market, pay, ummi, support
// Har biri: /start + Mini App (web_app) tugma + Humo ID bog'lash (/link) + /help.
// Boy logikali botlar (humo_ai = AI chat, bozor_narxida = BN) o'z route'larida qoladi.
// Emoji ishlatilmaydi (founder qoidasi) — faqat matn + HTML.

import type { BotKey } from "@/lib/telegram-bots";
import { BOTS, sendMessage, sendChatAction } from "@/lib/telegram-bots";
import type { TgUpdate } from "@/lib/telegram-bot";
import {
    tryHandleLinkCommand,
    personalGreet,
    forHumoEcosystemBlock,
    pickLang,
    FOR_HUMO_URL,
} from "@/lib/telegram-bot-common";
import { findLinkedProfile } from "@/lib/telegram-link";

type Lang = "uz" | "ru" | "en";

function openLabel(lang: Lang): string {
    return lang === "ru" ? "Открыть приложение" : lang === "en" ? "Open the app" : "Ilovani ochish";
}

function miniAppKeyboard(bot: BotKey, lang: Lang) {
    return { inline_keyboard: [[{ text: openLabel(lang), web_app: { url: BOTS[bot].miniAppUrl } }]] };
}

function startText(bot: BotKey, lang: Lang): string {
    const name = BOTS[bot].label;
    if (lang === "ru") return `Это бот <b>${name}</b> — часть экосистемы For Humo.\n\nНажмите кнопку ниже, чтобы открыть приложение прямо в Telegram.`;
    if (lang === "en") return `This is the <b>${name}</b> bot — part of the For Humo ecosystem.\n\nTap the button below to open the app right inside Telegram.`;
    return `Bu — <b>${name}</b> boti, For Humo ekotizimining bir qismi.\n\nIlovani Telegram ichida ochish uchun quyidagi tugmani bosing.`;
}

function linkHint(lang: Lang): string {
    if (lang === "ru") return `\n\n<b>Привязать Humo ID:</b> получите код на <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> и отправьте <code>/link КОД</code>.`;
    if (lang === "en") return `\n\n<b>Link your Humo ID:</b> get a code at <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> and send <code>/link CODE</code>.`;
    return `\n\n<b>Humo ID'ni bog'lash:</b> <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> dan kod oling va <code>/link KOD</code> yuboring.`;
}

function helpText(lang: Lang): string {
    if (lang === "ru") return `<b>Команды:</b>\n/start — открыть приложение\n/link КОД — привязать Humo ID\n/help — помощь`;
    if (lang === "en") return `<b>Commands:</b>\n/start — open the app\n/link CODE — link Humo ID\n/help — help`;
    return `<b>Buyruqlar:</b>\n/start — ilovani ochish\n/link KOD — Humo ID bog'lash\n/help — yordam`;
}

function linkOnlyText(lang: Lang): string {
    if (lang === "ru") return `Получите код на <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> и отправьте <code>/link КОД</code>.`;
    if (lang === "en") return `Get a code at <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> and send <code>/link CODE</code>.`;
    return `Kodni <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> dan oling va <code>/link KOD</code> yuboring.`;
}

function defaultText(bot: BotKey, lang: Lang): string {
    const name = BOTS[bot].label;
    if (lang === "ru") return `Я бот <b>${name}</b>. Откройте приложение кнопкой ниже.`;
    if (lang === "en") return `I'm the <b>${name}</b> bot. Open the app with the button below.`;
    return `Men <b>${name}</b> botiman. Ilovani quyidagi tugma bilan oching.`;
}

/** Generic bot direct-chat update'ini qayta ishlaydi. */
export async function handleGenericUpdate(bot: BotKey, update: TgUpdate): Promise<void> {
    const msg = update.message;
    if (!msg || msg.from?.is_bot) return;

    const tgId = String(msg.from?.id ?? "");
    if (!tgId) return;
    const chatId = msg.chat.id;
    const text = (msg.text ?? msg.caption ?? "").trim();
    const lang = pickLang(msg.from?.language_code);

    // 1) /link KOD yoki /start link_KOD — Humo ID bog'lash
    const linkHandled = await tryHandleLinkCommand({
        bot, text, telegramUserId: tgId,
        telegramUsername: msg.from?.username ?? null, chatId, lang,
    });
    if (linkHandled) return;

    // 2) /start
    if (text === "/start" || text.startsWith("/start")) {
        const [greet, linked] = await Promise.all([
            personalGreet(tgId, lang),
            findLinkedProfile(tgId),
        ]);
        const body =
            (greet ? greet + "\n\n" : "") +
            startText(bot, lang) +
            (linked ? "" : linkHint(lang)) +
            forHumoEcosystemBlock(lang);
        await sendMessage(bot, {
            chatId, text: body, parseMode: "HTML",
            replyMarkup: miniAppKeyboard(bot, lang), disableWebPreview: true,
        });
        return;
    }

    // 3) /help
    if (text === "/help") {
        await sendMessage(bot, { chatId, text: helpText(lang), parseMode: "HTML", replyMarkup: miniAppKeyboard(bot, lang) });
        return;
    }

    // 4) /link (kodsiz)
    if (text === "/link") {
        await sendMessage(bot, { chatId, text: linkOnlyText(lang), parseMode: "HTML" });
        return;
    }

    // 5) Oddiy xabar — ilovani ochishga yumshoq yo'naltirish
    void sendChatAction(bot, chatId, "typing").catch(() => { /* noop */ });
    await sendMessage(bot, { chatId, text: defaultText(bot, lang), parseMode: "HTML", replyMarkup: miniAppKeyboard(bot, lang) });
}
