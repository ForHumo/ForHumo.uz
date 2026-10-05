// Humo ID'ga Telegram orqali bildirishnoma yuborish (barcha modul ishlatadi).
//
//   await notifyTelegram(profileId, "Matn", { preferBot: "esport" });
//
// Telegram qoidasi: bot faqat o'zini START bosgan foydalanuvchiga xabar yubora oladi.
// Shuning uchun: avval modul boti (preferBot), u bloklangan bo'lsa HUB @ForHumoBot'ga
// fallback. Foydalanuvchi link paytida hub'ni start bosgani uchun fallback odatda yetadi.
// To'liq fail-safe — hech qachon throw qilmaydi (chaqiruvchini buzmaydi).

import { prisma } from "@/lib/prisma";
import { sendMessage, sendPhoto, type BotKey } from "@/lib/telegram-bots";

/** profileId → bog'langan Telegram user id (yo'q bo'lsa null). */
export async function getLinkedTelegramId(profileId: string): Promise<string | null> {
    try {
        const identity = await prisma.identity.findFirst({
            where: { profileId, provider: "TELEGRAM" },
            select: { providerId: true },
        });
        return identity?.providerId ?? null;
    } catch {
        return null;
    }
}

export interface NotifyResult {
    sent: boolean;
    notLinked?: boolean;    // Humo ID Telegram'ga bog'lanmagan
    blocked?: boolean;      // Bog'langan, lekin hech bir bot yubora olmadi (start bosilmagan/bloklangan)
}

interface NotifyOpts {
    preferBot?: BotKey;                 // Modul boti (masalan "esport"); bloklansa hub'ga fallback
    parseMode?: "HTML" | "MarkdownV2";
    replyMarkup?: object;               // Masalan Mini App ochish tugmasi
    disableWebPreview?: boolean;
    imageUrl?: string;                  // Berilsa — sendPhoto (rasm + caption)
}

const HUB: BotKey = "humo_id";   // @ForHumo_IDBot — link orqali start bosilgan, kafolatlangan kanal

/**
 * Bog'langan Humo ID'ga Telegram xabar yuboradi. preferBot → bloklansa HUB fallback.
 */
export async function notifyTelegram(profileId: string, text: string, opts: NotifyOpts = {}): Promise<NotifyResult> {
    const tgId = await getLinkedTelegramId(profileId);
    if (!tgId) return { sent: false, notLinked: true };

    // Urinish tartibi: preferBot (hub'dan farqli bo'lsa) → hub
    const order: BotKey[] = [];
    if (opts.preferBot && opts.preferBot !== HUB) order.push(opts.preferBot);
    order.push(HUB);

    let blocked = false;
    for (const bot of order) {
        try {
            const res = opts.imageUrl
                ? await sendPhoto(bot, {
                    chatId: tgId, photoUrl: opts.imageUrl, caption: text,
                    parseMode: opts.parseMode ?? "HTML", replyMarkup: opts.replyMarkup,
                })
                : await sendMessage(bot, {
                    chatId: tgId, text,
                    parseMode: opts.parseMode ?? "HTML", replyMarkup: opts.replyMarkup,
                    disableWebPreview: opts.disableWebPreview ?? true,
                });
            if (res.ok) return { sent: true };
            // 403 = foydalanuvchi bu botni start bosmagan yoki bloklagan → keyingisiga o'tamiz
            if (res.error_code === 403) { blocked = true; continue; }
            // Boshqa xato (token yo'q emas — bu throw bo'lardi; masalan 400) → keyingisini sinaymiz
            blocked = true;
        } catch {
            // tokenFor throw (bot token env yo'q) yoki tarmoq — keyingisini sinaymiz
            continue;
        }
    }
    return { sent: false, blocked };
}

/** Mini App ochish tugmasi (bildirishnoma ostiga qo'yish uchun). */
export function miniAppButton(url: string, label = "Ochish"): object {
    return { inline_keyboard: [[{ text: label, web_app: { url } }]] };
}

function escHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fullUrl(link: string): string {
    if (/^https?:\/\//.test(link)) return link;
    return "https://www.forhumo.uz" + (link.startsWith("/") ? link : "/" + link);
}

/** Qulay: sarlavha + matn + ixtiyoriy "Ochish" (url) tugma bilan Telegram bildirishnoma.
 *  Modullar shuni chaqiradi (eSport/Market/Pay/Support). Fail-safe. */
export async function notifyTelegramSimple(
    profileId: string,
    title: string,
    body?: string | null,
    opts: { preferBot?: BotKey; url?: string | null } = {},
): Promise<NotifyResult> {
    const text = `<b>${escHtml(title)}</b>` + (body ? `\n${escHtml(body)}` : "");
    const url = opts.url ? fullUrl(opts.url) : undefined;
    const replyMarkup = url ? { inline_keyboard: [[{ text: "Ochish", url }]] } : undefined;
    return notifyTelegram(profileId, text, { preferBot: opts.preferBot, replyMarkup, parseMode: "HTML" });
}

/** Boyitilgan bildirishnoma: ism + bosiladigan @username (→ Nexus ommaviy profil) +
 *  izoh (blockquote/sitata) + ixtiyoriy Ummi rasmi + "Ochish" tugma.
 *  Dinamik qismlar ichkarida escape qilinadi (xavfsiz). */
export async function notifyTelegramRich(profileId: string, opts: {
    title: string;
    body?: string | null;
    actor?: { name?: string | null; username?: string | null } | null;
    note?: string | null;
    imageUrl?: string | null;
    url?: string | null;
    preferBot?: BotKey;
}): Promise<NotifyResult> {
    const lines: string[] = [`<b>${escHtml(opts.title)}</b>`];
    if (opts.body) lines.push(escHtml(opts.body));
    if (opts.actor && (opts.actor.name || opts.actor.username)) {
        const nm = opts.actor.name ? escHtml(opts.actor.name) : "";
        const un = opts.actor.username
            ? `<a href="https://www.forhumo.uz/nexus/u/${encodeURIComponent(opts.actor.username)}">@${escHtml(opts.actor.username)}</a>`
            : "";
        lines.push([nm, un].filter(Boolean).join(" · "));
    }
    if (opts.note) lines.push(`<blockquote>${escHtml(opts.note)}</blockquote>`);
    const text = lines.join("\n");
    const url = opts.url ? fullUrl(opts.url) : undefined;
    const replyMarkup = url ? { inline_keyboard: [[{ text: "Ochish", url }]] } : undefined;
    return notifyTelegram(profileId, text, {
        preferBot: opts.preferBot, replyMarkup,
        imageUrl: opts.imageUrl ?? undefined, parseMode: "HTML",
    });
}
