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
}
