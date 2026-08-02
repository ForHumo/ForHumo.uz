import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { notify } from "@/lib/market-notify";
import { grantAchievement } from "@/lib/achievements";

// Platforma komissiyasi (sotuvchidan ushlab qolinadi)
export const MARKET_COMMISSION = 0.05; // 5%

// Buyurtma yetkazilganda sotuvchilarga Zij to'lash (komissiya ayirib).
// Faqat ZIJ to'langan buyurtmalar uchun (naqd/karta — sotuvchi to'g'ridan oladi).
// settledAt orqali ikki marta to'lashdan himoyalangan.
export async function settleOrder(orderId: string) {
    const order = await prisma.marketOrder.findUnique({
        where: { id: orderId },
        include: {
            items: {
                select: {
                    quantity: true, price: true,
                    product: { select: { brand: { select: { ownerId: true } } } },
                },
            },
        },
    });
    if (!order) return;
    if (order.settledAt) return;                       // allaqachon to'langan
    if (order.status !== "DELIVERED") return;          // faqat yetkazilgan
    if (order.paymentMethod !== "WALLET") {            // naqd/karta — hamyon harakati yo'q, faqat belgilaymiz
        await prisma.marketOrder.update({ where: { id: orderId }, data: { settledAt: new Date() } });
        return;
    }

    // Sotuvchi bo'yicha summalar
    const perSeller = new Map<string, number>();
    for (const it of order.items) {
        const owner = it.product.brand.ownerId;
        perSeller.set(owner, (perSeller.get(owner) ?? 0) + Number(it.price) * it.quantity);
    }

    const short = `#${order.id.slice(-8).toUpperCase()}`;
    const payouts: { ownerId: string; net: number }[] = [];
    const ops: Prisma.PrismaPromise<unknown>[] = [];

    for (const [ownerId, gross] of perSeller) {
        const net = Math.round(gross * (1 - MARKET_COMMISSION) * 100) / 100;
        if (net <= 0) continue;
        let wallet = await prisma.wallet.findUnique({ where: { profileId: ownerId } });
        if (!wallet) wallet = await prisma.wallet.create({ data: { profileId: ownerId } });
        const newBalance = Number(wallet.balance) + net;
        ops.push(prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }));
        ops.push(prisma.walletTransaction.create({
            data: {
                walletId: wallet.id, type: "SALE", amount: net, balanceAfter: newBalance,
                description: `Market sotuv ${short}`, ref: order.id,
            },
        }));
        payouts.push({ ownerId, net });
    }
    ops.push(prisma.marketOrder.update({ where: { id: orderId }, data: { settledAt: new Date() } }));
    await prisma.$transaction(ops);

    // Sotuvchilarga bildirishnoma + yutuqlar (tier'lar)
    for (const p of payouts) {
        await notify(p.ownerId, {
            type: "ORDER_UPDATE",
            title: `Sotuvdan daromad: +${Number(p.net).toLocaleString()} so'm`,
            body: `${short} yetkazildi — hamyoningizga tushdi`,
            link: `/market/dashboard`,
        });
        // Tier-based sotuv yutuqlari — brend egasining jami settled buyurtmalari soni
        const ownerBrands = await prisma.marketBrand.findMany({ where: { ownerId: p.ownerId }, select: { id: true } });
        const brandIds = ownerBrands.map(b => b.id);
        if (brandIds.length) {
            const salesCount = await prisma.marketOrderItem.count({
                where: { product: { brandId: { in: brandIds } }, order: { settledAt: { not: null } } },
            });
            await grantAchievement(p.ownerId, "market.first_sale");
            if (salesCount >= 10) await grantAchievement(p.ownerId, "market.10_sales");
            if (salesCount >= 100) await grantAchievement(p.ownerId, "market.100_sales");
        }
    }
}
