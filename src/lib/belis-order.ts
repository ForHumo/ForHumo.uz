// Belis order helpers — kod generatsiya, narx hisoblash.

import { prisma } from "@/lib/prisma";

// Belis buyurtma kodi: BLS-YYNN-NNNN (BLS-2601-0001)
// YY = yil oxirgi 2 raqami, NN = oy, NNNN = shu oydagi tartib raqami
export async function generateBelisOrderCode(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const count = await prisma.belisOrder.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
    });
    const seq = String(count + 1).padStart(4, "0");
    return `BLS-${yy}${mm}-${seq}`;
}

// Yetkazish narxi hisoblash (soddalashtirilgan)
// Real Yandex API kelgach `lib/delivery.ts` ni ulaydigan qilamiz.
export function calcBelisDeliveryFee(
    fulfillType: "YANDEX_DELIVERY" | "BTS_EXPRESS" | "PICKUP",
    subtotal: number,
): number {
    if (fulfillType === "PICKUP") return 0;
    if (fulfillType === "YANDEX_DELIVERY") {
        // Toshkent bo'ylab tez yetkazish — o'rtacha 25 000 so'm
        // 500 000+ buyurtma bo'lsa bepul
        if (subtotal >= 500_000) return 0;
        return 25_000;
    }
    // BTS Express (viloyatlar) — o'rtacha 40 000 so'm
    if (subtotal >= 1_000_000) return 0;
    return 40_000;
}
