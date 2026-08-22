// Belis Telegram Bot (@belisuz_bot) integratsiya.
// TELEGRAM_BOT_TOKEN env sozlangan bo'lsa ishlaydi.
// Real bot token .env.local ga qo'yiladi: TELEGRAM_BELIS_BOT_TOKEN

const BOT_TOKEN = process.env.TELEGRAM_BELIS_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_BELIS_ADMIN_CHAT_ID;   // Sevinch opa chatId (ixtiyoriy)
const WEB_APP_URL = process.env.TELEGRAM_BELIS_WEBAPP_URL || "https://forhumo.uz/uz/belis";

export function belisBotAvailable(): boolean { return !!BOT_TOKEN; }

// Bot API'ga xabar yuborish
export async function belisBotSend(chatId: string, text: string, options?: {
    parse_mode?: "HTML" | "Markdown";
    reply_markup?: unknown;
}): Promise<boolean> {
    if (!BOT_TOKEN) return false;
    try {
        const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: options?.parse_mode ?? "HTML",
                ...(options?.reply_markup ? { reply_markup: options.reply_markup } : {}),
            }),
        });
        return r.ok;
    } catch { return false; }
}

// Web App tugmali klaviatura
export function belisWebAppButton(text = "🛍 Belis'ni ochish") {
    return { inline_keyboard: [[{ text, web_app: { url: WEB_APP_URL } }]] };
}

// Admin chatga xabar (yangi buyurtma va h.k.)
export async function belisNotifyAdmin(text: string, options?: { parse_mode?: "HTML" | "Markdown"; reply_markup?: unknown }): Promise<boolean> {
    if (!ADMIN_CHAT_ID) return false;
    return belisBotSend(ADMIN_CHAT_ID, text, options);
}
