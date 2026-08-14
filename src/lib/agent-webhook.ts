// Agent webhook infratuzilma — Telegram Bot API'ning `setWebhook` + `sendMessage` ekvivalenti.
//
// Ikki yo'nalish:
//   1. Server → Agent (outbound):  sendToAgentWebhook()
//      Foydalanuvchi agentga DM yozganda, agent.webhookUrl'ga imzolangan POST.
//      Javob JSON'da matn/media bo'lsa avtomatik agent xabari sifatida qaytariladi.
//
//   2. Agent → Server (inbound): api/nexus/agents/webhook-inbox
//      Agent proaktiv xabar yuborishi mumkin (masalan cron trigger, tashqi event).
//      API kalit va HMAC imzo tekshiriladi.
//
// Xavfsizlik:
//   - HMAC-SHA256 (secret = agent.apiKey, message = raw JSON body)
//   - Timestamp ± 5 daqiqa (replay attack himoyasi)
//   - Timeout 8s (asilib qolgan agent DM ni bloklamasin)
//   - fetch xatoligi silent — foydalanuvchi tajribasi buzilmasin
//   - Agent apiKey yo'q yoki webhookUrl yo'q → sekin fail

import crypto from "crypto";

export const WEBHOOK_TIMEOUT_MS = 8000;
export const WEBHOOK_SIGNATURE_HEADER = "X-Forhumo-Signature";
export const WEBHOOK_TIMESTAMP_HEADER = "X-Forhumo-Timestamp";
export const WEBHOOK_EVENT_HEADER = "X-Forhumo-Event";
export const AGENT_API_KEY_HEADER = "X-Forhumo-Api-Key";
export const AGENT_KEY_PREFIX = "agk_";
export const REPLAY_WINDOW_SEC = 300;

export function generateApiKey(): string {
    return AGENT_KEY_PREFIX + crypto.randomBytes(32).toString("hex");
}

// HMAC-SHA256: `sha256=<hex>` format (GitHub webhook naqshi)
export function signPayload(secret: string, timestamp: string, body: string): string {
    const h = crypto.createHmac("sha256", secret);
    h.update(`${timestamp}.${body}`);
    return "sha256=" + h.digest("hex");
}

// Konstant-vaqtli tenglik solishtiruv (timing attack himoyasi)
export function verifySignature(secret: string, timestamp: string, body: string, signature: string): boolean {
    if (!secret || !timestamp || !signature) return false;
    // Timestamp balandligi tekshiruvi (replay)
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > REPLAY_WINDOW_SEC) return false;

    const expected = signPayload(secret, timestamp, body);
    try {
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

export interface AgentInlineButton {
    text: string;               // 1-32 belgi (ko'rinuvchi matn)
    callbackData?: string;      // 1-64 belgi (agent'ga qaytadi)
    url?: string;               // yoki tashqi havola (yangi tab)
}

export interface AgentWebhookPayload {
    event: "message.created" | "callback.query";
    chatId: string;             // NexusConversation id
    messageId: string;          // asosiy xabar id (yoki callback holatida bosilgan xabar)
    from: {
        profileId: string;
        username: string | null;
        name: string | null;
    };
    text: string;
    mediaUrl: string | null;
    mediaType: string | null;
    // Faqat event="callback.query" holatida:
    callbackData?: string;
    timestamp: number;          // unix seconds
}

export interface AgentWebhookReply {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaMime?: string;
    mediaName?: string;
    // Inline tugmalar (Telegram uslub) — qatorlar: [[btn1, btn2], [btn3]]
    buttons?: AgentInlineButton[][];
}

// Server → Agent POST. Javob bo'lsa qaytariladi (caller uni yangi agent xabari sifatida yozadi).
// Xato/timeout → null (caller silent fail).
export async function sendToAgentWebhook(
    agent: { webhookUrl: string | null; apiKey: string | null },
    payload: AgentWebhookPayload,
): Promise<AgentWebhookReply | null> {
    if (!agent.webhookUrl || !agent.apiKey) return null;
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signPayload(agent.apiKey, timestamp, body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
        const r = await fetch(agent.webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                [WEBHOOK_EVENT_HEADER]: payload.event,
                [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
                [WEBHOOK_SIGNATURE_HEADER]: signature,
                "User-Agent": "ForHumo-Agent-Webhook/1",
            },
            body,
            signal: controller.signal,
        });
        if (!r.ok) return null;
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) return null;
        const data = await r.json().catch(() => null) as AgentWebhookReply | null;
        if (!data || typeof data !== "object") return null;
        // Sanitizatsiya — foydalanuvchi tomonidan boshqariladigan agent javobiga
        const reply: AgentWebhookReply = {};
        if (typeof data.text === "string" && data.text.trim()) {
            reply.text = data.text.trim().slice(0, 4000);
        }
        if (typeof data.mediaUrl === "string" && data.mediaUrl.startsWith("http")) {
            reply.mediaUrl = data.mediaUrl.slice(0, 1000);
            if (typeof data.mediaType === "string" && ["image", "video", "audio", "file"].includes(data.mediaType)) {
                reply.mediaType = data.mediaType;
            } else {
                reply.mediaType = "file";
            }
            if (typeof data.mediaMime === "string") reply.mediaMime = data.mediaMime.slice(0, 100);
            if (typeof data.mediaName === "string") reply.mediaName = data.mediaName.slice(0, 200);
        }
        // Inline tugmalar — 8x3 grid maksimum (safety cap)
        if (Array.isArray(data.buttons)) {
            const rows: AgentInlineButton[][] = [];
            for (const row of data.buttons.slice(0, 8)) {
                if (!Array.isArray(row)) continue;
                const cleanRow: AgentInlineButton[] = [];
                for (const b of row.slice(0, 3)) {
                    if (!b || typeof b !== "object") continue;
                    const btn = b as { text?: unknown; callbackData?: unknown; url?: unknown };
                    if (typeof btn.text !== "string" || !btn.text.trim()) continue;
                    const out: AgentInlineButton = { text: btn.text.trim().slice(0, 32) };
                    if (typeof btn.callbackData === "string") out.callbackData = btn.callbackData.slice(0, 64);
                    if (typeof btn.url === "string" && (btn.url.startsWith("http://") || btn.url.startsWith("https://"))) {
                        out.url = btn.url.slice(0, 500);
                    }
                    if (out.callbackData || out.url) cleanRow.push(out);
                }
                if (cleanRow.length > 0) rows.push(cleanRow);
            }
            if (rows.length > 0) reply.buttons = rows;
        }
        if (!reply.text && !reply.mediaUrl && !reply.buttons) return null;
        return reply;
    } catch {
        // AbortError, network xatoligi, TLS — hammasi silent
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}
