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

// Yuqori darajali yordamchi — agar suhbatdagi peer agent bo'lsa system eventini fire qiladi.
// Fail-safe: agent yo'q yoki webhook sozlanmagan bo'lsa hech nima qilmaydi.
// Ishlatish: edit/delete/pin endpoint'larida after() ichida chaqiring.
export async function fireAgentEventIfPeer(
    prisma: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nexusAgent: { findUnique: (args: any) => Promise<any> };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userProfile: { findUnique: (args: any) => Promise<any> };
    },
    peerProfileId: string,
    payload: Omit<AgentWebhookPayload, "from" | "timestamp"> & { fromProfileId: string },
): Promise<void> {
    const agent = await prisma.nexusAgent.findUnique({
        where: { profileId: peerProfileId },
        select: { profileId: true, webhookUrl: true, apiKey: true },
    });
    if (!agent || !agent.webhookUrl || !agent.apiKey) return;

    const senderProfile = await prisma.userProfile.findUnique({
        where: { id: payload.fromProfileId },
        select: { username: true, name: true },
    });

    const { fromProfileId, ...rest } = payload;
    void fromProfileId;
    await sendToAgentWebhook(agent, {
        ...rest,
        from: {
            profileId: payload.fromProfileId,
            username: senderProfile?.username ?? null,
            name: senderProfile?.name ?? null,
        },
        timestamp: Math.floor(Date.now() / 1000),
    });
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

export interface AgentInvoice {
    amount: number;             // > 0, foydalanuvchi valyutasida
    currency: "UZS" | "USD";
    description: string;        // 1-200 belgi
    payload?: string;           // ixtiyoriy: agent identifikator (invoice.paid webhook'da qaytariladi)
}

export type AgentWebhookEvent =
    | "message.created"     // yangi xabar
    | "message.edited"      // foydalanuvchi xabarini tahrirladi
    | "message.deleted"     // foydalanuvchi hamma uchun o'chirdi
    | "message.pinned"      // xabar pinga qo'yildi
    | "message.unpinned"    // pindan olindi
    | "callback.query"      // inline tugma bosildi
    | "invoice.paid"        // invoice to'landi
    | "inline.query";       // @bot query composer'da — agent natijalar qaytaradi

export interface AgentWebhookPayload {
    event: AgentWebhookEvent;
    chatId: string;             // NexusConversation id
    messageId: string;          // asosiy xabar id (yoki callback/invoice holatida bosilgan xabar)
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
    // Faqat event="invoice.paid" holatida:
    invoice?: {
        amount: number;
        currency: string;
        description: string;
        payload?: string;
        txRef: string;          // to'lov ledger ref
    };
    // Faqat event="message.edited" holatida — eski matn (agar mavjud bo'lsa)
    previousText?: string;
    // Faqat event="inline.query" holatida — foydalanuvchi kiritgan so'rov
    query?: string;
    timestamp: number;          // unix seconds
}

// Inline mode — agent qaytargan bitta natija.
export interface AgentInlineResult {
    id: string;                 // agent tomonidan tayin, dedup uchun
    title: string;              // 1-100 belgi (ro'yxatda ko'rinuvchi sarlavha)
    description?: string;       // 1-200 belgi (subtitle)
    thumbnailUrl?: string;      // rasm URL (avatar, small preview)
    message: {                  // tanlangan holda yuboriladigan xabar
        text?: string;          // 1-2000 belgi
        mediaUrl?: string;
        mediaType?: string;     // "image" | "video" | "audio" | "file"
        mediaMime?: string;
        mediaName?: string;
    };
}

export interface AgentInlineReply {
    results: AgentInlineResult[];   // maks 20 ta
    cacheSeconds?: number;          // ixtiyoriy (hozircha ishlatilmaydi)
}

export interface AgentWebhookReply {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaMime?: string;
    mediaName?: string;
    // Inline tugmalar (Telegram uslub) — qatorlar: [[btn1, btn2], [btn3]]
    buttons?: AgentInlineButton[][];
    // To'lov invoice (Telegram uslub) — ekranda "To'lash X UZS" tugmasi paydo bo'ladi.
    invoice?: AgentInvoice;
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
        // Invoice — to'lov so'rovi
        if (data.invoice && typeof data.invoice === "object") {
            const inv = data.invoice as { amount?: unknown; currency?: unknown; description?: unknown; payload?: unknown };
            const amount = typeof inv.amount === "number" ? inv.amount : NaN;
            const currency = inv.currency === "USD" ? "USD" : (inv.currency === "UZS" ? "UZS" : null);
            const description = typeof inv.description === "string" ? inv.description.trim().slice(0, 200) : "";
            if (amount > 0 && amount < 1_000_000_000 && currency && description) {
                reply.invoice = {
                    amount, currency: currency as "UZS" | "USD", description,
                    ...(typeof inv.payload === "string" ? { payload: inv.payload.slice(0, 128) } : {}),
                };
            }
        }
        if (!reply.text && !reply.mediaUrl && !reply.buttons && !reply.invoice) return null;
        return reply;
    } catch {
        // AbortError, network xatoligi, TLS — hammasi silent
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Inline query — bot'ga @bot query yuborib natijalarni oladi.
// Xato/timeout/yaroqsiz javob → bo'sh massiv (caller silent qaytadi).
export async function fetchAgentInlineResults(
    agent: { webhookUrl: string | null; apiKey: string | null },
    payload: AgentWebhookPayload,
): Promise<AgentInlineResult[]> {
    if (!agent.webhookUrl || !agent.apiKey) return [];
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
        if (!r.ok) return [];
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) return [];
        const data = await r.json().catch(() => null) as AgentInlineReply | null;
        if (!data || !Array.isArray(data.results)) return [];

        const out: AgentInlineResult[] = [];
        for (const raw of data.results.slice(0, 20)) {
            if (!raw || typeof raw !== "object") continue;
            const r0 = raw as Partial<AgentInlineResult> & { message?: Partial<AgentInlineResult["message"]> };
            if (typeof r0.id !== "string" || !r0.id.trim()) continue;
            if (typeof r0.title !== "string" || !r0.title.trim()) continue;
            const msg = r0.message ?? {};
            const cleanMsg: AgentInlineResult["message"] = {};
            if (typeof msg.text === "string" && msg.text.trim()) cleanMsg.text = msg.text.trim().slice(0, 2000);
            if (typeof msg.mediaUrl === "string" && msg.mediaUrl.startsWith("http")) {
                cleanMsg.mediaUrl = msg.mediaUrl.slice(0, 1000);
                cleanMsg.mediaType = typeof msg.mediaType === "string" && ["image", "video", "audio", "file"].includes(msg.mediaType)
                    ? msg.mediaType : "file";
                if (typeof msg.mediaMime === "string") cleanMsg.mediaMime = msg.mediaMime.slice(0, 100);
                if (typeof msg.mediaName === "string") cleanMsg.mediaName = msg.mediaName.slice(0, 200);
            }
            if (!cleanMsg.text && !cleanMsg.mediaUrl) continue;   // bo'sh xabar — o'tkazamiz

            const clean: AgentInlineResult = {
                id:      r0.id.trim().slice(0, 100),
                title:   r0.title.trim().slice(0, 100),
                message: cleanMsg,
            };
            if (typeof r0.description === "string" && r0.description.trim()) clean.description = r0.description.trim().slice(0, 200);
            if (typeof r0.thumbnailUrl === "string" && r0.thumbnailUrl.startsWith("http")) clean.thumbnailUrl = r0.thumbnailUrl.slice(0, 1000);
            out.push(clean);
        }
        return out;
    } catch {
        return [];
    } finally {
        clearTimeout(timeoutId);
    }
}
