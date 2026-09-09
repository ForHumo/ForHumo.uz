// Multi-bot Telegram API wrapper.
// For Humo'da hozir 2 bot ishlaydi:
//   - humo_ai           → @ForHumo_AIBot   (universal AI + Business Mode)
//   - bozor_narxida     → @bozornarxidabot (marketplace bot)
//
// Har bot uchun alohida token va webhook secret env'da:
//   HUMO_BOT_TOKEN + HUMO_BOT_WEBHOOK_SECRET
//   BN_BOT_TOKEN   + BN_BOT_WEBHOOK_SECRET

export type BotKey = "humo_ai" | "bozor_narxida";

export interface BotInfo {
    key: BotKey;
    username: string;                              // @username (bosh yozuvsiz)
    tokenEnvKey: string;
    secretEnvKey: string;
    webhookPath: string;                           // /api/... (host'siz)
    label: string;                                 // Odam o'qiydigan nom
}

export const BOTS: Record<BotKey, BotInfo> = {
    humo_ai: {
        key: "humo_ai",
        username: "ForHumo_AIBot",
        tokenEnvKey: "HUMO_BOT_TOKEN",
        secretEnvKey: "HUMO_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/humo-bot/webhook",
        label: "Humo AI",
    },
    bozor_narxida: {
        key: "bozor_narxida",
        username: "bozornarxidabot",
        tokenEnvKey: "BN_BOT_TOKEN",
        secretEnvKey: "BN_BOT_WEBHOOK_SECRET",
        webhookPath: "/api/telegram/bn-bot/webhook",
        label: "Bozor Narxida",
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

/** Chat action (typing) — Humo AI uchun ham qayta ishlatiladi. */
export async function sendChatAction(bot: BotKey, chatId: number | string, action: "typing" | "upload_photo" = "typing"): Promise<TgResponse<boolean>> {
    return tgCall(bot, "sendChatAction", { chat_id: chatId, action });
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
