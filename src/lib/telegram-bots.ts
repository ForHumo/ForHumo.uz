// Multi-bot Telegram API wrapper.
// For Humo'da 10 bot — har biri Mini App (web_app) + /start + Humo ID link.
//   forhumo, humo_id, humo_ai, nexus, esport, market, pay, bozor_narxida, ummi, support
// humo_ai va bozor_narxida — o'z boy webhook route'lari bor (AI chat / BN).
// Qolgan 8 tasi — umumiy dinamik route (/api/telegram/[bot]/webhook) +
// telegram-bot-generic.ts (salom + Mini App tugma + Humo ID bog'lash).
// Har bot uchun token/secret env'da (BOTS[key].tokenEnvKey / secretEnvKey).

export type BotKey =
    | "forhumo" | "humo_id" | "humo_ai" | "nexus" | "esport"
    | "market" | "pay" | "bozor_narxida" | "ummi" | "support";

export interface BotInfo {
    key: BotKey;
    username: string;                              // @username (bosh yozuvsiz)
    tokenEnvKey: string;
    secretEnvKey: string;
    webhookPath: string;                           // /api/... (host'siz)
    label: string;                                 // Odam o'qiydigan nom
    miniAppUrl: string;                            // Telegram Mini App (web_app) URL
    generic?: boolean;                             // true = umumiy dinamik handler ishlatadi
}

export const BOTS: Record<BotKey, BotInfo> = {
    forhumo: {
        key: "forhumo",
        username: "ForHumoBot",
        tokenEnvKey: "FORHUMO_BOT_TOKEN",
        secretEnvKey: "FORHUMO_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/forhumo/webhook",
        label: "For Humo",
        miniAppUrl: "https://forhumo.uz",
        generic: true,
    },
    humo_id: {
        key: "humo_id",
        username: "ForHumo_IDBot",
        tokenEnvKey: "HUMO_ID_BOT_TOKEN",
        secretEnvKey: "HUMO_ID_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/humo_id/webhook",
        label: "Humo ID",
        miniAppUrl: "https://forhumo.uz/id",
        generic: true,
    },
    humo_ai: {
        key: "humo_ai",
        username: "ForHumo_AIBot",
        tokenEnvKey: "HUMO_BOT_TOKEN",
        secretEnvKey: "HUMO_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/humo-bot/webhook",
        label: "Humo AI",
        miniAppUrl: "https://forhumo.uz/ai",
    },
    nexus: {
        key: "nexus",
        username: "ForHumo_NexusBot",
        tokenEnvKey: "NEXUS_BOT_TOKEN",
        secretEnvKey: "NEXUS_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/nexus/webhook",
        label: "Humo Nexus",
        miniAppUrl: "https://forhumo.uz/nexus",
        generic: true,
    },
    esport: {
        key: "esport",
        username: "ForHumo_eSportBot",
        tokenEnvKey: "ESPORT_BOT_TOKEN",
        secretEnvKey: "ESPORT_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/esport/webhook",
        label: "Humo eSport",
        miniAppUrl: "https://forhumo.uz/esport",
        generic: true,
    },
    market: {
        key: "market",
        username: "ForHumo_MarketBot",
        tokenEnvKey: "MARKET_BOT_TOKEN",
        secretEnvKey: "MARKET_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/market/webhook",
        label: "Humo Market",
        miniAppUrl: "https://forhumo.uz/market",
        generic: true,
    },
    pay: {
        key: "pay",
        username: "ForHumo_PayBot",
        tokenEnvKey: "PAY_BOT_TOKEN",
        secretEnvKey: "PAY_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/pay/webhook",
        label: "For Pay",
        miniAppUrl: "https://forhumo.uz/pay",
        generic: true,
    },
    bozor_narxida: {
        key: "bozor_narxida",
        username: "bozornarxidabot",
        tokenEnvKey: "BN_BOT_TOKEN",
        secretEnvKey: "BN_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/bn-bot/webhook",
        label: "Bozor Narxida",
        miniAppUrl: "https://bozornarxida.uz",
    },
    ummi: {
        key: "ummi",
        username: "ForHumo_UmmiBot",
        tokenEnvKey: "UMMI_BOT_TOKEN",
        secretEnvKey: "UMMI_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/ummi/webhook",
        label: "Ummi",
        // /ummi sahifasi hali yo'q (404) — vaqtincha hub; Ummi fazasida to'g'rilanadi
        miniAppUrl: "https://forhumo.uz",
        generic: true,
    },
    support: {
        key: "support",
        username: "ForHumo_SupportBot",
        tokenEnvKey: "SUPPORT_BOT_TOKEN",
        secretEnvKey: "SUPPORT_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/support/webhook",
        label: "Humo Support",
        miniAppUrl: "https://forhumo.uz/support",
        generic: true,
    },
};

const TG_API = "https://api.telegram.org";

function tokenFor(bot: BotKey): string {
    const key = BOTS[bot].tokenEnvKey;
    const t = process.env[key];
    if (!t) throw new Error(`${key} not set`);
    return t;
}

export function secretFor(bot: BotKey): string | undefined {
    const key = BOTS[bot].secretEnvKey;
    return process.env[key];
}

export interface TgResponse<T = unknown> {
    ok: boolean;
    result?: T;
    description?: string;
    error_code?: number;
}

export async function tgCall<T = unknown>(bot: BotKey, method: string, params: object = {}): Promise<TgResponse<T>> {
    const token = tokenFor(bot);
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

/**
 * File orqali binary yuborish (rasm ta'rifi uchun getFile → bytes olish).
 */
export async function tgGetFileBytes(bot: BotKey, fileId: string): Promise<Buffer | null> {
    const info = await tgCall<{ file_path: string }>(bot, "getFile", { file_id: fileId });
    if (!info.ok || !info.result?.file_path) return null;
    const token = tokenFor(bot);
    try {
        const r = await fetch(`${TG_API}/file/bot${token}/${info.result.file_path}`);
        if (!r.ok) return null;
        const arr = await r.arrayBuffer();
        return Buffer.from(arr);
    } catch { return null; }
}

/** Oddiy chat rejim — ChatBot javob yuboradi. */
export async function sendMessage(bot: BotKey, params: {
    chatId: number | string;
    text: string;
    parseMode?: "HTML" | "MarkdownV2";
    replyMarkup?: object;
    disableWebPreview?: boolean;
}): Promise<TgResponse<{ message_id: number }>> {
    return tgCall<{ message_id: number }>(bot, "sendMessage", {
        chat_id: params.chatId,
        text: params.text,
        parse_mode: params.parseMode,
        reply_markup: params.replyMarkup,
        link_preview_options: params.disableWebPreview ? { is_disabled: true } : undefined,
    });
}

/** Rasm + caption yuborish (URL bo'yicha). Bildirishnomalar uchun (Ummi rasmi). */
export async function sendPhoto(bot: BotKey, params: {
    chatId: number | string;
    photoUrl: string;
    caption?: string;
    parseMode?: "HTML" | "MarkdownV2";
    replyMarkup?: object;
}): Promise<TgResponse<{ message_id: number }>> {
    return tgCall<{ message_id: number }>(bot, "sendPhoto", {
        chat_id: params.chatId,
        photo: params.photoUrl,
        caption: params.caption,
        parse_mode: params.parseMode,
        reply_markup: params.replyMarkup,
    });
}

/** Chat action (typing) — Humo AI uchun ham qayta ishlatiladi. */
export async function sendChatAction(bot: BotKey, chatId: number | string, action: "typing" | "upload_photo" | "record_voice" | "upload_voice" = "typing"): Promise<TgResponse<boolean>> {
    return tgCall(bot, "sendChatAction", { chat_id: chatId, action });
}

/** Voice (OGG/OPUS buffer) yuborish — Business Mode va oddiy chat uchun. */
export async function sendVoice(bot: BotKey, params: {
    chatId: number | string;
    voiceBuffer: Buffer;
    businessConnectionId?: string;
    caption?: string;
    parseMode?: "HTML" | "MarkdownV2";
}): Promise<TgResponse<{ message_id: number }>> {
    const token = tokenFor(bot);
    // multipart/form-data uchun native FormData
    const form = new FormData();
    form.set("chat_id", String(params.chatId));
    if (params.businessConnectionId) form.set("business_connection_id", params.businessConnectionId);
    if (params.caption) form.set("caption", params.caption);
    if (params.parseMode) form.set("parse_mode", params.parseMode);
    const blob = new Blob([new Uint8Array(params.voiceBuffer)], { type: "audio/ogg" });
    form.set("voice", blob, "voice.ogg");

    try {
        const r = await fetch(`${TG_API}/bot${token}/sendVoice`, {
            method: "POST",
            body: form,
        });
        return await r.json() as TgResponse<{ message_id: number }>;
    } catch (e) {
        return { ok: false, description: e instanceof Error ? e.message : "network_error" };
    }
}

export async function setWebhook(bot: BotKey, url: string, secretToken: string, allowedUpdates: string[]): Promise<TgResponse<boolean>> {
    return tgCall<boolean>(bot, "setWebhook", {
        url,
        allowed_updates: allowedUpdates,
        secret_token: secretToken,
        drop_pending_updates: true,
    });
}

export async function getMe(bot: BotKey): Promise<TgResponse<{ id: number; username: string }>> {
    return tgCall(bot, "getMe");
}
