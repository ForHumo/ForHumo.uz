// BN narx kelishuvi rezervatsiyalari (BnPriceDeal) — concurrency himoyasi.
// ACCEPT'da yaratiladi, checkout'da qo'llanadi/iste'mol qilinadi.
// Faol = status=ACTIVE AND expiresAt > now (muddati o'tsa avtomatik bo'shaydi).

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const DEAL_HOURS = 48;

// Band qilingan (faol rezervatsiya) qty yig'indisi. excludeBuyerId — o'z
// rezervatsiyasini hisobga olmaslik (checkout'da o'zi bandlagan stock'ni
// "boshqa band" deb sanamaslik uchun).
export async function reservedQty(
    db: Prisma.TransactionClient,
    productId: string,
    excludeBuyerId?: string,
): Promise<number> {
    const agg = await db.bnPriceDeal.aggregate({
        _sum: { qty: true },
        where: {
            productId,
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
            ...(excludeBuyerId ? { buyerId: { not: excludeBuyerId } } : {}),
        },
    });
    return agg._sum.qty ?? 0;
}

// Ko'p mahsulot uchun xaridorning faol kelishuvlari (checkout/cart) → productId→deal
export async function activeDealsMap(
    profileId: string,
    productIds: string[],
): Promise<Map<string, { id: string; agreedPrice: number; qty: number }>> {
    const m = new Map<string, { id: string; agreedPrice: number; qty: number }>();
    if (productIds.length === 0) return m;
    const rows = await prisma.bnPriceDeal.findMany({
        where: {
            buyerId: profileId,
            productId: { in: productIds },
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
        },
        select: { id: true, productId: true, agreedPrice: true, qty: true },
        orderBy: { createdAt: "desc" },
    });
    for (const r of rows) {
        if (!m.has(r.productId)) m.set(r.productId, { id: r.id, agreedPrice: r.agreedPrice, qty: r.qty });
    }
    return m;
}
