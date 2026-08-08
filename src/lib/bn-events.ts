// BN foydalanuvchi hodisalarini yozish — rekomendatsiya uchun signal.
// Fail-safe: xatoni yutadi (rekomendatsiya kritik emas, xarid xatoga tushmasin).

import { prisma } from "@/lib/prisma";

export type BnEventType = "VIEW" | "CART" | "FAV" | "PURCHASE";

const WEIGHTS: Record<BnEventType, number> = {
    VIEW: 1,       // eng zaif signal (ko'ryapti xolos)
    CART: 3,       // aniqroq qiziqish (savatga qo'shdi)
    FAV: 4,        // yanada kuchliroq (sevimliga qo'ydi)
    PURCHASE: 10,  // eng kuchli signal (haqiqiy xarid)
};

/** Har event yozadi. Fail-safe. */
export async function trackBnEvent(input: {
    profileId: string;
    productId: string;
    type: BnEventType;
}): Promise<void> {
    try {
        await prisma.bnUserEvent.create({
            data: {
                profileId: input.profileId,
                productId: input.productId,
                type: input.type,
                weight: WEIGHTS[input.type],
            },
        });
    } catch {
        // ignore — rekomendatsiya baxtsizligi xarid uchun xatarli emas
    }
}
