// Web Push (VAPID) yuborish. Kalitlar yo'q bo'lsa — jim o'tkazib yuboriladi.
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function ensure(): boolean {
    if (configured) return true;
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return false;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@forhumo.uz", pub, priv);
    configured = true;
    return true;
}

export function pushAvailable(): boolean {
    return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export interface PushPayload {
    title: string;
    body: string;
    url?: string;       // bosilganda ochiladi
    tag?: string;
    /** Ixtiyoriy tracker: notificationclick paytida shu id serverga POST qilinadi
     *  (BN broadcast CTR uchun). sw.js `data.trackClickPath`ga jo'natadi. */
    trackClickPath?: string;
    /** TRUE bo'lsa — Telegram'ga ham yuboriladi (Humo ID bog'langan bo'lsa).
     *  Faqat MUHIM bildirishnomalarda yoqing (buyurtma/to'lov/eSport/support) —
     *  Nexus mayda ijtimoiy shovqin (like/izoh) Telegram'ga ketmasligi uchun. */
    tg?: boolean;
    tgPreferBot?: import("@/lib/telegram-bots").BotKey;   // modul boti; bloklansa hub fallback
    tgImageUrl?: string;                                   // Telegram'da rasm (Ummi) — sendPhoto
}

function escTgHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Bitta foydalanuvchining barcha qurilmalariga push yuborish.
// O'lik (410/404) obunalarni tozalaydi.
export async function sendPushToProfile(profileId: string, payload: PushPayload): Promise<void> {
    if (!ensure()) return;
    try {
        const subs = await prisma.nexusPushSub.findMany({ where: { profileId } });
        if (!subs.length) return;
        const data = JSON.stringify(payload);
        await Promise.all(subs.map(async s => {
            try {
                await webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    data,
                );
            } catch (err: unknown) {
                const code = (err as { statusCode?: number })?.statusCode;
                if (code === 404 || code === 410) {
                    await prisma.nexusPushSub.deleteMany({ where: { endpoint: s.endpoint } }).catch(() => { });
                }
            }
        }));
    } catch {
        /* push asosiy amalni buzmaydi */
    }

    // Telegram oynasi (opt-in) — web push'dan mustaqil, fail-safe
    if (payload.tg) {
        try {
            const { notifyTelegram } = await import("@/lib/telegram-notify");
            const text = `<b>${escTgHtml(payload.title)}</b>` + (payload.body ? `\n${escTgHtml(payload.body)}` : "");
            const replyMarkup = payload.url
                ? { inline_keyboard: [[{ text: "Ochish", url: payload.url }]] }
                : undefined;
            await notifyTelegram(profileId, text, { preferBot: payload.tgPreferBot, replyMarkup, parseMode: "HTML", imageUrl: payload.tgImageUrl });
        } catch { /* Telegram xato asosiy amalni buzmaydi */ }
    }
}
