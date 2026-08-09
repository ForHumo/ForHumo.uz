// BN bildirishnoma helper — fail-safe (xato bo'lsa order/checkout uzilmaydi).
// Chaqiruvchi joylar: order create, status transitions, review, ban, return.

import { prisma } from "@/lib/prisma";
import type { BnNotifType } from "@prisma/client";

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
}
