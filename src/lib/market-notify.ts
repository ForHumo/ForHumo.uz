import { prisma } from "@/lib/prisma";

type NotifType =
    | "REVIEW_LIKE" | "PRODUCT_REVIEW" | "BRAND_REVIEW"
    | "ORDER_DELIVERED" | "ORDER_ACCEPTED" | "REVIEW_REMINDER" | "REPLY";

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
}
