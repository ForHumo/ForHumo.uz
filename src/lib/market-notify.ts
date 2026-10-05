import { prisma } from "@/lib/prisma";
import { notifyTelegramRich } from "@/lib/telegram-notify";

type NotifType =
    | "REVIEW_LIKE" | "PRODUCT_REVIEW" | "BRAND_REVIEW"
    | "ORDER_DELIVERED" | "ORDER_ACCEPTED" | "ORDER_UPDATE" | "REVIEW_REMINDER" | "REPLY"
    | "QUESTION" | "ANSWER";

interface NotifInput {
    type: NotifType;
    title: string;
    body?: string;
    link?: string;
    image?: string;
}

// Bitta bildirishnoma yaratadi (xatolik yuz bersa jim — asosiy oqimni buzmaydi)
export async function notify(profileId: string, n: NotifInput) {
    try {
        await prisma.marketNotification.create({
            data: {
                profileId,
                type: n.type,
                title: n.title,
                body: n.body ?? null,
                link: n.link ?? null,
                image: n.image ?? null,
            },
        });
    } catch {
        /* bildirishnoma muhim emas — asosiy amal davom etadi */
    }
    // Buyurtma/sotuv bildirishnomalari Telegram'ga ham (ORDER_* — sharh/savol shovqini emas)
    if (n.type.startsWith("ORDER")) {
        void notifyTelegramRich(profileId, {
            title: n.title, body: n.body,
            imageUrl: "https://www.forhumo.uz/notif/order.png",
            url: n.link, preferBot: "market",
        }).catch(() => { /* jim */ });
    }
}
