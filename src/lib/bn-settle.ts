// BN escrow settle — buyurtma COMPLETED bo'lganda sotuvchiga to'lash.
// Xuddi Market'dagi settleOrder pattern. Idempotent (settledAt bilan).
//
// FAZA 5-D:
//   settleOrder(orderId)   COMPLETED bo'ldi → sotuvchiga (komissiya ayirilgan) SALE
//   refundOrder(orderId)   CANCELLED bo'ldi → xaridorga REFUND (agar HELD bo'lgan bo'lsa)

import { prisma } from "@/lib/prisma";
import { getOrCreateWalletTx } from "@/lib/wallet";

/** Komissiya foizi (0.05 = 5%). Env orqali sozlanadi. */
export const BN_COMMISSION = Math.max(0, Math.min(0.5, Number(process.env.BN_COMMISSION ?? 0.05)));

/** Xaridor buyurtma kodini idempotent qilib qaytaradi. */
export function orderRef(kind: "hold" | "settle" | "refund", orderId: string) {
    return `bn:${kind}:${orderId}`;
}

/** Buyurtma to'ldirilganda sotuvchiga escrow'dan ozod qilish. */
export async function settleOrder(orderId: string): Promise<{ ok: boolean; reason?: string }> {
    const order = await prisma.bnOrder.findUnique({
        where: { id: orderId },
        include: { shop: { select: { profileId: true } } },
    });
    if (!order) return { ok: false, reason: "not_found" };
    if (order.settledAt) return { ok: true, reason: "already_settled" };
    if (order.paymentMethod !== "WALLET") return { ok: true, reason: "cash_no_settle" };
    if (!order.escrowHeld) return { ok: false, reason: "escrow_not_held" };
    if (!order.shop?.profileId) return { ok: false, reason: "no_seller" };

    const gross = order.total;
    const fee = Math.round(gross * BN_COMMISSION);
    const net = gross - fee;

    try {
        await prisma.$transaction(async (tx) => {
            const wallet = await getOrCreateWalletTx(tx, order.shop!.profileId);
            const newBalance = Number(wallet.balance) + net;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "SALE",
                    amount: net,
                    currency: wallet.currency,
                    balanceAfter: newBalance,
                    description: `BN buyurtma #${order.code} (komissiya ${(BN_COMMISSION * 100).toFixed(1)}%)`,
                    ref: orderRef("settle", order.id),
                },
            });
            await tx.bnOrder.update({
                where: { id: order.id },
                data: { settledAt: new Date(), commission: fee, paymentStatus: "PAID" },
            });
        });
        return { ok: true };
    } catch (e: unknown) {
        // P2002 — allaqachon yozilgan (idempotent)
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("P2002") || msg.includes("Unique constraint")) return { ok: true, reason: "duplicate" };
        return { ok: false, reason: msg };
    }
}

/** Buyurtma bekor qilinganda xaridorga qaytarish. */
export async function refundOrder(orderId: string): Promise<{ ok: boolean; reason?: string }> {
    const order = await prisma.bnOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
    });
    if (!order) return { ok: false, reason: "not_found" };
    if (order.paymentMethod !== "WALLET") return { ok: true, reason: "cash_no_refund" };
    if (!order.escrowHeld) return { ok: true, reason: "not_held" };

    try {
        await prisma.$transaction(async (tx) => {
            const wallet = await getOrCreateWalletTx(tx, order.buyerId);
            const newBalance = Number(wallet.balance) + order.total;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "REFUND",
                    amount: order.total,
                    currency: wallet.currency,
                    balanceAfter: newBalance,
                    description: `BN buyurtma #${order.code} bekor qilindi`,
                    ref: orderRef("refund", order.id),
                },
            });
            // Stokni tiklaymiz
            for (const it of order.items) {
                await tx.bnProduct.update({
                    where: { id: it.productId },
                    data: { stock: { increment: it.qty }, sold: { decrement: it.qty } },
                });
            }
            await tx.bnOrder.update({
                where: { id: order.id },
                data: { escrowHeld: false, paymentStatus: "REFUNDED" },
            });
        });
        return { ok: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("P2002")) return { ok: true, reason: "duplicate" };
        return { ok: false, reason: msg };
    }
}
