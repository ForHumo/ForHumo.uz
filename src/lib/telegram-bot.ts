// Humo AI Telegram Business Bot — API wrapper.
// Bot Token: HUMO_BOT_TOKEN env
// Business Mode: foydalanuvchi BotFather orqali yoqadi.

const TG_API = "https://api.telegram.org";

function tokenOrThrow(): string {
    const t = process.env.HUMO_BOT_TOKEN;
    if (!t) throw new Error("HUMO_BOT_TOKEN not set");
    return t;
}

interface TgResponse<T = unknown> { ok: boolean; result?: T; description?: string; error_code?: number }

async function tgCall<T = unknown>(method: string, params: object = {}): Promise<TgResponse<T>> {
    const token = tokenOrThrow();
    try {
        const r = await fetch(`${TG_API}/bot${token}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
        });
        return await r.json() as TgResponse<T>;
    } catch (e) {
        return { ok: false, description: e instanceof Error ? e.message : "network_error" };
    }
}

/** Business rejimda javob yuborish. business_connection_id kerak. */
export async function sendBusinessMessage(params: {
    businessConnectionId: string;
    chatId: number | string;
    text: string;
    replyToMessageId?: number;
    parseMode?: "HTML" | "MarkdownV2";
}): Promise<TgResponse<{ message_id: number }>> {
    return tgCall<{ message_id: number }>("sendMessage", {
        business_connection_id: params.businessConnectionId,
        chat_id: params.chatId,
        text: params.text,
        parse_mode: params.parseMode,
        reply_parameters: params.replyToMessageId ? { message_id: params.replyToMessageId } : undefined,
    });
}

/** Oddiy chat rejimda javob (bot bilan direct chat). */
export async function sendMessage(params: {
    chatId: number | string;
    text: string;
    parseMode?: "HTML" | "MarkdownV2";
    replyMarkup?: object;
}): Promise<TgResponse<{ message_id: number }>> {
    return tgCall<{ message_id: number }>("sendMessage", {
        chat_id: params.chatId,
        text: params.text,
        parse_mode: params.parseMode,
        reply_markup: params.replyMarkup,
    });
}

/** Webhook o'rnatish. Faqat bir marta chaqirilishi kerak (deploy paytida). */
export async function setWebhook(url: string, secretToken?: string): Promise<TgResponse<boolean>> {
    return tgCall<boolean>("setWebhook", {
        url,
        allowed_updates: [
            "message",                          // Oddiy bot chat
            "callback_query",                   // Inline tugma
            "business_connection",              // Business ulanish o'zgarishi
            "business_message",                 // Business chat'da yangi xabar
            "edited_business_message",          // O'zgartirilgan xabar
            "deleted_business_messages",        // O'chirilgan xabar
        ],
        secret_token: secretToken,
        drop_pending_updates: false,
    });
}

/** Webhook info olish. */
export async function getWebhookInfo(): Promise<TgResponse<{ url: string; has_custom_certificate: boolean; pending_update_count: number }>> {
    return tgCall("getWebhookInfo");
}

/** Bot info olish. */
export async function getMe(): Promise<TgResponse<{ id: number; username: string; can_connect_to_business: boolean }>> {
    return tgCall("getMe");
}

/** Chat'da "typing..." indikatori (Business chat). */
export async function sendBusinessChatAction(params: {
    businessConnectionId: string;
    chatId: number | string;
    action?: "typing" | "upload_photo" | "record_voice";
}): Promise<TgResponse<boolean>> {
    return tgCall("sendChatAction", {
        business_connection_id: params.businessConnectionId,
        chat_id: params.chatId,
        action: params.action ?? "typing",
    });
}

// ── Update turlari ──────────────────────────────────────────────────────────

export interface TgUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
}

export interface TgChat {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
    title?: string;
    first_name?: string;
    username?: string;
}

export interface TgBusinessConnection {
    id: string;                                 // Connection ID
    user: TgUser;                               // Business account egasi
    user_chat_id: number;                       // Egasi bilan bot chat
    date: number;
    rights?: { can_reply?: boolean };           // 2024-11 dan boshlab
    is_enabled: boolean;
}

export interface TgBusinessMessage {
    message_id: number;
    business_connection_id: string;             // Qaysi ulanish orqali
    from?: TgUser;                              // Mijoz (Business akkaunt eganing suhbatdoshi)
    sender_business_bot?: TgUser;               // Bot javobi
    chat: TgChat;
    date: number;
    text?: string;
    reply_to_message?: { message_id: number };
}

export interface TgUpdate {
    update_id: number;
    message?: TgBusinessMessage;                          // Oddiy bot chat
    business_connection?: TgBusinessConnection;
    business_message?: TgBusinessMessage;
    edited_business_message?: TgBusinessMessage;
    deleted_business_messages?: {
        business_connection_id: string;
        chat: TgChat;
        message_ids: number[];
    };
    callback_query?: {
        id: string;
        from: TgUser;
        message?: TgBusinessMessage;
        data?: string;
    };
}
