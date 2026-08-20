// BN bildirishnoma helper — fail-safe (xato bo'lsa order/checkout uzilmaydi).
// Chaqiruvchi joylar: order create, status transitions, review, ban, return.
// DB'ga yozadi + (agar obuna bo'lsa) Web Push yuboradi.

import { prisma } from "@/lib/prisma";
import type { BnNotifType } from "@prisma/client";
import { sendPushToProfile } from "@/lib/push";

// BN link'ni to'liq URL'ga (bozornarxida.uz'ga) aylantirish — bosilganda tab ochish uchun.
function bnLinkToUrl(link: string | null | undefined): string {
    if (!link) return "https://bozornarxida.uz/";
    if (link.startsWith("http")) return link;
    if (link.startsWith("/")) return `https://bozornarxida.uz${link}`;
    return `https://bozornarxida.uz/${link}`;
}

export async function bnNotify(input: {
    profileId: string;
    type: BnNotifType;
    title: string;
    body?: string | null;
    link?: string | null;
}) {
    try {
        await prisma.bnNotification.create({
            data: {
                profileId: input.profileId,
                type: input.type,
                title: input.title,
                body: input.body ?? null,
                link: input.link ?? null,
            },
        });
    } catch { /* fail-safe */ }

    // Web Push (agar obuna bo'lsa) — fail-safe: bildirishnoma yozilgani muhim
    try {
        await sendPushToProfile(input.profileId, {
            title: input.title,
            body: input.body ?? "",
            url: bnLinkToUrl(input.link),
            tag: `bn:${input.type}`,
        });
    } catch { /* ignore */ }
}
