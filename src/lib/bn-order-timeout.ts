// BN buyurtma 30-daqiqa timeout — sotuvchi qabul qilmasa avto-cancel.
//
// Xaridor tomonidan buyurtma berilgach, sotuvchi 30 daqiqa ichida CONFIRMED
// holatiga o'tkazishi kerak. Aks holda auto-cancel + refund.
//
// Ikki joyda tetiklanadi:
//   1) Lazy: /api/bn/orders/[id]/live GET har chaqirilganda tekshirish
//   2) Cron backup: /api/cron/bn-order-timeout kunlik (agar hech kim GET qilmagan bo'lsa)

import { prisma } from "@/lib/prisma";
import { refundOrder } from "@/lib/bn-settle";
import { bnNotify } from "@/lib/bn-notify";

/** 30 daqiqa millisekundda */
export const BN_SELLER_TIMEOUT_MS = 30 * 60 * 1000;

/** Bitta buyurtmani tekshirib, timeout bo'lsa cancel qiladi. Idempotent — takroran chaqirsangiz zarar bermaydi. */
export async function checkOrderTimeout(orderId: string): Promise<{ cancelled: boolean }> {
    const o = await prisma.bnOrder.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, placedAt: true, buyerId: true, shopId: true, code: true },
    });
    if (!o || o.status !== "PLACED") return { cancelled: false };
    const age = Date.now() - o.placedAt.getTime();
    if (age < BN_SELLER_TIMEOUT_MS) return { cancelled: false };

    // Auto-cancel + refund
    await prisma.bnOrder.update({
        where: { id: o.id },
        data:  {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "Sotuvchi 30 daqiqa ichida javob bermadi (auto-cancel)",
        },
    });
    await refundOrder(o.id).catch(() => null);

    // Bildirishnoma — xaridor va sotuvchiga
    void bnNotify({
        profileId: o.buyerId,
        type: "ORDER_CANCELLED",
        title: `Buyurtma ${o.code} bekor qilindi`,
        body: "Sotuvchi 30 daqiqa ichida javob bermadi. Pul hamyoningizga qaytarildi.",
        link: `/kabinet/buyurtma/${o.id}`,
    }).catch(() => null);

    // Sotuvchini ham xabardor qilish (o'z do'koni egasiga)
    const shop = await prisma.bnShop.findUnique({
        where: { id: o.shopId },
        select: { profileId: true },
    });
    if (shop?.profileId) {
        void bnNotify({
            profileId: shop.profileId,
            type: "ORDER_CANCELLED",
            title: `Buyurtma ${o.code} avto-bekor`,
            body: "Buyurtmani 30 daqiqa ichida qabul qilmadingiz. Xaridor pulini qaytarib berdik.",
            link: `/kabinet/sotuvchi/buyurtma/${o.id}`,
        }).catch(() => null);
    }

    return { cancelled: true };
}

/** Barcha eskirgan PLACED buyurtmalarni bulk-check qiladi (cron uchun). */
export async function checkAllPendingTimeouts(): Promise<{ scanned: number; cancelled: number }> {
    const cutoff = new Date(Date.now() - BN_SELLER_TIMEOUT_MS);
    const stuck = await prisma.bnOrder.findMany({
        where: { status: "PLACED", placedAt: { lte: cutoff } },
        select: { id: true },
        take: 200, // xavfsizlik cheklovi
    });
    let cancelled = 0;
    for (const o of stuck) {
        const r = await checkOrderTimeout(o.id).catch(() => ({ cancelled: false }));
        if (r.cancelled) cancelled++;
    }
    return { scanned: stuck.length, cancelled };
}
