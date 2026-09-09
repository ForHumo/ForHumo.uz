// Bot chatlari uchun umumiy matn/handler'lar (uz/ru/en).
// Har ikkala bot (Humo AI + BN) shu yerdan foydalanadi.

import type { BotKey } from "@/lib/telegram-bots";
import { claimLinkCode, findLinkedProfile } from "@/lib/telegram-link";
import { sendMessage } from "@/lib/telegram-bots";

export const FOR_HUMO_FOLDER = "https://t.me/addlist/8lYDrZg58nUwMmEy";
export const FOR_HUMO_URL = "https://forhumo.uz";

type Lang = "uz" | "ru" | "en";

export function pickLang(code?: string | null): Lang {
    if (!code) return "uz";
    const c = code.slice(0, 2).toLowerCase();
    if (c === "ru") return "ru";
    if (c === "en") return "en";
    if (c === "uz") return "uz";
    return "en";
}

/** For Humo kanal folderi + Mini App havolalari — har bot /start'ida ko'rsatiladi. */
export function forHumoEcosystemBlock(lang: Lang): string {
    if (lang === "ru") {
        return `\n\n<b>Экосистема For Humo:</b>\n` +
            `• <a href="${FOR_HUMO_FOLDER}">Все каналы одной папкой</a> — добавить к себе\n` +
            `• <a href="${FOR_HUMO_URL}">forhumo.uz</a> — сайт (Belis, Nexus, Market, BN, Pay)`;
    }
    if (lang === "en") {
        return `\n\n<b>For Humo ecosystem:</b>\n` +
            `• <a href="${FOR_HUMO_FOLDER}">All channels in one folder</a>\n` +
            `• <a href="${FOR_HUMO_URL}">forhumo.uz</a> — the app (Belis, Nexus, Market, BN, Pay)`;
    }
    return `\n\n<b>For Humo ekotizimi:</b>\n` +
        `• <a href="${FOR_HUMO_FOLDER}">Barcha kanallar bitta folder'da</a> — o'zingizga qo'shing\n` +
        `• <a href="${FOR_HUMO_URL}">forhumo.uz</a> — sayt (Belis, Nexus, Market, BN, Pay)`;
}

/**
 * "/start link_CODE" yoki "/link CODE" ni ushlash.
 * Return: true agar handle qilingan bo'lsa (webhook boshqa logic'ga o'tmasin).
 */
export async function tryHandleLinkCommand(opts: {
    bot: BotKey;
    text: string;
    telegramUserId: string;
    telegramUsername: string | null;
    chatId: number;
    lang: Lang;
}): Promise<boolean> {
    const text = opts.text.trim();
    let code: string | null = null;

    const startMatch = text.match(/^\/start\s+link_([A-Z0-9]{6,8})$/i);
    const linkMatch = text.match(/^\/link\s+([A-Z0-9]{6,8})$/i);
    if (startMatch) code = startMatch[1];
    else if (linkMatch) code = linkMatch[1];
    if (!code) return false;

    const result = await claimLinkCode(code, opts.telegramUserId, opts.telegramUsername, null, opts.bot);
    if (result.ok) {
        const name = result.profile?.name ?? result.profile?.username ?? "For Humo foydalanuvchisi";
        await sendMessage(opts.bot, {
            chatId: opts.chatId,
            text: linkedSuccessText(opts.lang, name, result.profile?.humoId ?? null),
            parseMode: "HTML",
            disableWebPreview: false,
        });
    } else {
        await sendMessage(opts.bot, {
            chatId: opts.chatId,
            text: linkedErrorText(opts.lang, result.error),
            parseMode: "HTML",
            disableWebPreview: true,
        });
    }
    return true;
}

function linkedSuccessText(lang: Lang, name: string, humoId: string | null): string {
    if (lang === "ru") {
        return `<b>Готово!</b> Ваш Telegram привязан к Humo ID.\n\n` +
            `Приветствую, <b>${escapeHtml(name)}</b>!${humoId ? ` (${humoId})` : ""}\n\n` +
            `Теперь оба бота (@ForHumo_AIBot и @bozornarxidabot) знают, что это вы. ` +
            `Можно спрашивать о своих заказах, кошельке, продуктах и т.д.` +
            forHumoEcosystemBlock(lang);
    }
    if (lang === "en") {
        return `<b>Done!</b> Your Telegram is linked to Humo ID.\n\n` +
            `Welcome, <b>${escapeHtml(name)}</b>!${humoId ? ` (${humoId})` : ""}\n\n` +
            `Both bots (@ForHumo_AIBot and @bozornarxidabot) now know it's you. ` +
            `Ask about your orders, wallet, products, etc.` +
            forHumoEcosystemBlock(lang);
    }
    return `<b>Tayyor!</b> Sizning Telegram Humo ID'ga bog'landi.\n\n` +
        `Xush kelibsiz, <b>${escapeHtml(name)}</b>!${humoId ? ` (${humoId})` : ""}\n\n` +
        `Endi ikkala bot ham (@ForHumo_AIBot va @bozornarxidabot) sizni taniydi. ` +
        `Buyurtmalaringiz, hamyoningiz, mahsulotlaringiz haqida savol bering.` +
        forHumoEcosystemBlock(lang);
}

function linkedErrorText(lang: Lang, error?: string): string {
    if (lang === "ru") {
        if (error === "not_found") return `Код не найден. Получите новый код на <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
        if (error === "expired") return `Код истёк (10 минут). Получите новый на <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
        if (error === "already_used") return `Этот код уже использован.`;
        if (error === "already_linked_other") return `Ваш Telegram уже привязан к другому Humo ID. Сначала отвяжите на <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
        return `Не удалось привязать. Попробуйте позже.`;
    }
    if (lang === "en") {
        if (error === "not_found") return `Code not found. Get a new code at <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
        if (error === "expired") return `Code expired (10 min). Get a new one at <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
        if (error === "already_used") return `This code is already used.`;
        if (error === "already_linked_other") return `Your Telegram is already linked to another Humo ID. Unlink at <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
        return `Failed to link. Try later.`;
    }
    if (error === "not_found") return `Kod topilmadi. Yangi kod: <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
    if (error === "expired") return `Kod muddati o'tdi (10 daq). Yangi kod: <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
    if (error === "already_used") return `Bu kod allaqachon ishlatilgan.`;
    if (error === "already_linked_other") return `Sizning Telegram boshqa Humo ID'ga bog'langan. Uzish: <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a>.`;
    return `Bog'lay olmadim. Keyinroq urinib ko'ring.`;
}

/** Personalized salom (agar link mavjud bo'lsa). */
export async function personalGreet(telegramUserId: string, lang: Lang): Promise<string | null> {
    const linked = await findLinkedProfile(telegramUserId);
    if (!linked) return null;
    const name = linked.name ?? linked.username ?? "";
    if (lang === "ru") return `Приветствую, <b>${escapeHtml(name)}</b>!${linked.humoId ? ` (${linked.humoId})` : ""}`;
    if (lang === "en") return `Welcome back, <b>${escapeHtml(name)}</b>!${linked.humoId ? ` (${linked.humoId})` : ""}`;
    return `Xush kelibsiz, <b>${escapeHtml(name)}</b>!${linked.humoId ? ` (${linked.humoId})` : ""}`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
