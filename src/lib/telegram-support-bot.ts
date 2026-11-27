// Humo Support — vaqtinchalik Telegram support oqimi (@ForHumo_SupportBot).
// Maqsad: Humo eSport (va boshqa modullar) in-app "Humo Support" tizimi 100%
// tayyor bo'lmaguncha, support'ni To'liq Telegram orqali olib borish — hammaga
// qulay, mustaqil (faqat Telegram kerak), tez.
//
// Oqim:
//   1) Foydalanuvchi @ForHumo_SupportBot'ga muammosini yozadi.
//   2) Bot darhol tasdiqlaydi ("qabul qilindi").
//   3) SUPPORT_ADMIN_CHAT_ID env bo'lsa — murojaat admin chat'iga (founder yoki
//      support guruh) yetkaziladi; xabar ichida `#u<chatId>` tegi bo'ladi.
//   4) Admin o'sha xabarga REPLY qilib javob yozsa — bot javobni foydalanuvchiga
//      qaytaradi (stateless: chatId reply_to_message matnidan o'qiladi, DB kerakmas).
//
// Guruh sozlamasi: botni support guruhga qo'shing, privacy mode YOQILGAN qolsin —
// bot faqat o'z xabariga reply'larni oladi (shovqinsiz), relay shu bilan ishlaydi.
// Env yo'q bo'lsa ham bot foydalanuvchiga javob beradi (murojaat console'ga log).
//
// Emoji ishlatilmaydi (founder qoidasi) — faqat matn + HTML.

import { sendMessage } from "@/lib/telegram-bots";
import type { TgUpdate } from "@/lib/telegram-bot";
import { tryHandleLinkCommand, pickLang, FOR_HUMO_URL } from "@/lib/telegram-bot-common";
import { findLinkedProfile } from "@/lib/telegram-link";

type Lang = "uz" | "ru" | "en";

const BOT = "support" as const;

function adminChatId(): string | null {
    const v = (process.env.SUPPORT_ADMIN_CHAT_ID ?? "").trim();
    return v || null;
}

function startText(lang: Lang): string {
    if (lang === "ru") return `<b>Humo Support</b> — поддержка For Humo.\n\nПросто напишите здесь свой вопрос или проблему, и наша команда ответит вам в этом чате.`;
    if (lang === "en") return `<b>Humo Support</b> — For Humo help desk.\n\nJust type your question or issue here and our team will reply to you right in this chat.`;
    return `<b>Humo Support</b> — For Humo yordam markazi.\n\nSavolingiz yoki muammoingizni shu yerga yozing — jamoamiz shu chatda javob beradi.`;
}

function linkHint(lang: Lang): string {
    if (lang === "ru") return `\n\nЧтобы мы узнали вас быстрее: получите код на <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> и отправьте <code>/link КОД</code>.`;
    if (lang === "en") return `\n\nTo help us identify you faster: get a code at <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> and send <code>/link CODE</code>.`;
    return `\n\nSizni tezroq aniqlashimiz uchun: <a href="${FOR_HUMO_URL}/id">forhumo.uz/id</a> dan kod oling va <code>/link KOD</code> yuboring.`;
}

function helpText(lang: Lang): string {
    if (lang === "ru") return `Напишите вопрос или проблему одним сообщением — мы ответим здесь.\n\n/link КОД — привязать Humo ID\n/start — начать заново`;
    if (lang === "en") return `Send your question or issue in a message — we'll reply here.\n\n/link CODE — link Humo ID\n/start — start over`;
    return `Savol yoki muammoingizni bitta xabarda yozing — shu yerda javob beramiz.\n\n/link KOD — Humo ID bog'lash\n/start — qaytadan boshlash`;
}

function ackText(lang: Lang): string {
    if (lang === "ru") return `Спасибо! Ваше обращение принято. Команда ответит вам в этом чате в ближайшее время.`;
    if (lang === "en") return `Thanks! Your message has been received. Our team will reply here shortly.`;
    return `Rahmat! Murojaatingiz qabul qilindi. Jamoamiz tez orada shu chatda javob beradi.`;
}

function noDestNote(lang: Lang): string {
    // SUPPORT_ADMIN_CHAT_ID hali sozlanmagan — foydalanuvchiga ko'rinmaydigan farq yo'q,
    // lekin halol: hozircha bevosita aloqa sekinroq bo'lishi mumkin.
    if (lang === "ru") return ``;
    if (lang === "en") return ``;
    return ``;
}

/** Admin javobini (reply) foydalanuvchiga qaytarish. Topilsa true. */
async function tryRelayAdminReply(update: TgUpdate, admin: string): Promise<boolean> {
    const msg = update.message;
    if (!msg) return false;
    if (String(msg.chat.id) !== admin) return false;      // faqat admin chat'dan
    const repliedText = msg.reply_to_message?.text ?? "";
    const m = repliedText.match(/#u(-?\d+)/);
    if (!m) return false;                                   // #u<chatId> topilmadi — relay emas
    const userChatId = m[1];
    const body = (msg.text ?? msg.caption ?? "").trim();
    if (!body) return true;                                 // reply bor-u matn yo'q — jim yutamiz

    const r = await sendMessage(BOT, {
        chatId: userChatId,
        text: `<b>Humo Support:</b>\n${escapeHtml(body)}`,
        parseMode: "HTML",
    });
    // Adminga qisqa tasdiq
    await sendMessage(BOT, {
        chatId: admin,
        text: r.ok ? `Yuborildi.` : `Yuborilmadi: ${r.description ?? "xato"}`,
    });
    return true;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Murojaatni admin chat'iga yetkazish (env bo'lsa). */
async function forwardToAdmin(params: {
    admin: string;
    userChatId: number;
    tgId: string;
    name: string;
    username: string | null;
    humoId: string | null;
    body: string;
}): Promise<void> {
    const who = params.username ? `${escapeHtml(params.name)} (@${params.username})` : escapeHtml(params.name);
    const humo = params.humoId ? `Humo ID: <code>${params.humoId}</code>` : `Humo ID: bog'lanmagan`;
    const header =
        `<b>Yangi murojaat</b>  #u${params.userChatId}\n` +
        `Kimdan: ${who} [tg:${params.tgId}]\n` +
        `${humo}\n` +
        `———\n`;
    await sendMessage(BOT, {
        chatId: params.admin,
        text: header + escapeHtml(params.body),
        parseMode: "HTML",
        disableWebPreview: true,
    });
}

/** Support bot update handler (generic handler shu yerga shoxlaydi). */
export async function handleSupportUpdate(update: TgUpdate): Promise<void> {
    const msg = update.message;
    if (!msg || msg.from?.is_bot) return;

    const chatId = msg.chat.id;
    const text = (msg.text ?? msg.caption ?? "").trim();
    const admin = adminChatId();

    // 0) /chatid — sozlash qulayligi: shu chat ID'sini qaytaradi (DM yoki guruhda).
    //    Buni SUPPORT_ADMIN_CHAT_ID env'iga qo'ying.
    if (text === "/chatid" || text.startsWith("/chatid@")) {
        await sendMessage(BOT, {
            chatId,
            text: `Chat ID: <code>${msg.chat.id}</code>\n\nBuni <b>SUPPORT_ADMIN_CHAT_ID</b> env'iga qo'ying — murojaatlar shu chatga keladi.`,
            parseMode: "HTML",
        });
        return;
    }

    // 1) Admin javobi (reply) — foydalanuvchiga qaytar
    if (admin && String(msg.chat.id) === admin) {
        await tryRelayAdminReply(update, admin);
        return;   // admin chat'dagi boshqa xabarlarga tegmaymiz (shovqin yo'q)
    }

    const tgId = String(msg.from?.id ?? "");
    if (!tgId) return;
    const lang = pickLang(msg.from?.language_code);

    // 1) /link KOD — Humo ID bog'lash
    const linkHandled = await tryHandleLinkCommand({
        bot: BOT, text, telegramUserId: tgId,
        telegramUsername: msg.from?.username ?? null, chatId, lang,
    });
    if (linkHandled) return;

    // 2) /start
    if (text === "/start" || text.startsWith("/start")) {
        const linked = await findLinkedProfile(tgId);
        await sendMessage(BOT, {
            chatId,
            text: startText(lang) + (linked ? "" : linkHint(lang)),
            parseMode: "HTML",
            disableWebPreview: true,
        });
        return;
    }

    // 3) /help
    if (text === "/help") {
        await sendMessage(BOT, { chatId, text: helpText(lang), parseMode: "HTML", disableWebPreview: true });
        return;
    }

    // 4) Oddiy xabar = murojaat
    if (!text) {
        // matnsiz (rasm/stiker) — yumshoq so'rov
        await sendMessage(BOT, { chatId, text: helpText(lang), parseMode: "HTML", disableWebPreview: true });
        return;
    }

    // Tasdiq + admin'ga yetkazish
    await sendMessage(BOT, { chatId, text: ackText(lang) + noDestNote(lang), parseMode: "HTML", disableWebPreview: true });

    if (admin) {
        const linked = await findLinkedProfile(tgId);
        const name = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || (linked?.name ?? "Foydalanuvchi");
        await forwardToAdmin({
            admin,
            userChatId: chatId,
            tgId,
            name,
            username: msg.from?.username ?? null,
            humoId: linked?.humoId ?? null,
            body: text,
        });
    } else {
        // Hali admin chat sozlanmagan — murojaat yo'qolmasin, log qoldiramiz
        console.log(`[support-ticket] from tg:${tgId} chat:${chatId}: ${text.slice(0, 500)}`);
    }
}
