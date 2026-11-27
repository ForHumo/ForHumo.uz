// eSport push — native ilova (Expo) bildirishnomalari. To'liq fail-safe:
// xato yuzaga kelsa asosiy amalni (EsNotification) buzmaydi.

import { Expo } from "expo-server-sdk";
import { prisma } from "@/lib/prisma";

const expo = new Expo();

interface PushInput { title: string; body?: string | null; href?: string | null }

/** Bitta foydalanuvchining barcha Expo tokenlariga push yuboradi. */
export async function sendEsportPush(profileId: string, n: PushInput): Promise<void> {
    try {
        const rows = await prisma.esPushToken.findMany({ where: { profileId }, select: { token: true } });
        const tokens = rows.map(r => r.token).filter(t => Expo.isExpoPushToken(t));
        if (tokens.length === 0) return;

        const messages = tokens.map(to => ({
            to,
            sound: "default" as const,
            title: n.title,
            body: n.body ?? undefined,
            data: n.href ? { href: n.href } : {},
        }));

        for (const chunk of expo.chunkPushNotifications(messages)) {
            try {
                const tickets = await expo.sendPushNotificationsAsync(chunk);
                tickets.forEach((t, i) => {
                    if (t.status === "error" && t.details?.error === "DeviceNotRegistered") {
                        const bad = chunk[i].to;
                        void prisma.esPushToken.deleteMany({ where: { token: String(bad) } }).catch(() => { });
                    }
                });
            } catch { /* chunk xatosi — jim */ }
        }
    } catch { /* fail-safe */ }
}
