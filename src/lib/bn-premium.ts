// BN Premium tier va Featured Listing uchun helper funksiyalar.
// Do'kon egasining Wallet'idan pul olib, tegishli obuna/boost yaratadi.

import { prisma } from "@/lib/prisma";
import { getOrCreateWalletTx } from "@/lib/wallet";
import type { BnPremiumTier } from "@prisma/client";

// ── Premium narxlar (so'mda oyiga) ──────────────────────────────────────────
export const PREMIUM_TIER_PRICE: Record<BnPremiumTier, number> = {
    BRONZE:   50_000,
    SILVER:   150_000,
    GOLD:     400_000,
    PLATINUM: 1_000_000,
};

export const PREMIUM_TIER_META: Record<BnPremiumTier, { name: string; nameRu: string; nameEn: string; color: string }> = {
    BRONZE:   { name: "Bronza",  nameRu: "Бронза",  nameEn: "Bronze",   color: "#B87333" },
    SILVER:   { name: "Kumush",  nameRu: "Серебро", nameEn: "Silver",   color: "#C0C0C0" },
    GOLD:     { name: "Oltin",   nameRu: "Золото",  nameEn: "Gold",     color: "#F5B301" },
    PLATINUM: { name: "Platina", nameRu: "Платина", nameEn: "Platinum", color: "#8B5CF6" },
};

// ── Featured narxlar ────────────────────────────────────────────────────────
export const FEATURED_PRICING = [
    { hours: 24,  amount: 20_000,  labelUz: "24 soat",   labelRu: "24 часа",  labelEn: "24 hours" },
    { hours: 72,  amount: 50_000,  labelUz: "3 kun",     labelRu: "3 дня",    labelEn: "3 days" },
    { hours: 168, amount: 100_000, labelUz: "7 kun",     labelRu: "7 дней",   labelEn: "7 days" },
] as const;

export type FeaturedHours = typeof FEATURED_PRICING[number]["hours"];

/** Do'kon egasi Wallet'idan pul yechib premium obuna ochish. */
export async function activatePremium(input: {
    shopId: string;
    tier: BnPremiumTier;
    ownerProfileId: string;
    monthsCount?: number;      // default 1
}): Promise<{ ok: boolean; reason?: string; subscriptionId?: string; endsAt?: Date }> {
    const months = Math.max(1, Math.min(12, input.monthsCount ?? 1));
    const monthly = PREMIUM_TIER_PRICE[input.tier];
    const total = monthly * months;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const wallet = await getOrCreateWalletTx(tx, input.ownerProfileId);
            if (Number(wallet.balance) < total) {
                throw new Error("insufficient_balance");
            }
            const newBal = Number(wallet.balance) - total;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });

            // Endsat — hozirgi premiumUntil'ga qo'shamiz (agar mavjud bo'lsa), aks holda hozirdan
            const shop = await tx.bnShop.findUnique({ where: { id: input.shopId }, select: { premiumUntil: true } });
            const base = shop?.premiumUntil && shop.premiumUntil > new Date() ? shop.premiumUntil : new Date();
            const endsAt = new Date(base.getTime() + months * 30 * 24 * 3600 * 1000);

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "PURCHASE",
                    amount: total,
                    currency: wallet.currency,
                    balanceAfter: newBal,
                    description: `BN Premium ${input.tier} × ${months} oy`,
                    ref: `bn:premium:${input.shopId}:${Date.now()}`,
                },
            });
            const sub = await tx.bnPremiumSubscription.create({
                data: {
                    shopId: input.shopId,
                    tier: input.tier,
                    amount: total,
                    endsAt,
                    autoRenew: false,
                },
            });
            await tx.bnShop.update({
                where: { id: input.shopId },
                data: { premiumTier: input.tier, premiumUntil: endsAt },
            });
            return { subscriptionId: sub.id, endsAt };
        });
        return { ok: true, ...result };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("insufficient_balance")) return { ok: false, reason: "insufficient_balance" };
        return { ok: false, reason: msg };
    }
}

/** Mahsulotni belgilangan soatlarga boost qilish. */
export async function activateFeatured(input: {
    productId: string;
    shopId: string;
    hours: FeaturedHours;
    ownerProfileId: string;
}): Promise<{ ok: boolean; reason?: string; expiresAt?: Date }> {
    const pricing = FEATURED_PRICING.find(p => p.hours === input.hours);
    if (!pricing) return { ok: false, reason: "invalid_duration" };

    try {
        const result = await prisma.$transaction(async (tx) => {
            const wallet = await getOrCreateWalletTx(tx, input.ownerProfileId);
            if (Number(wallet.balance) < pricing.amount) {
                throw new Error("insufficient_balance");
            }
            const newBal = Number(wallet.balance) - pricing.amount;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });

            // Deactivate existing active listing for this product (upsert-uslub)
            await tx.bnFeaturedListing.updateMany({
                where: { productId: input.productId, active: true },
                data: { active: false },
            });

            const expiresAt = new Date(Date.now() + input.hours * 3600 * 1000);
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "PURCHASE",
                    amount: pricing.amount,
                    currency: wallet.currency,
                    balanceAfter: newBal,
                    description: `BN Featured ${input.hours}h — mahsulot boost`,
                    ref: `bn:feature:${input.productId}:${Date.now()}`,
                },
            });
            await tx.bnFeaturedListing.create({
                data: {
                    productId: input.productId,
                    shopId: input.shopId,
                    paidAmount: pricing.amount,
                    expiresAt,
                    active: true,
                },
            });
            return { expiresAt };
        });
        return { ok: true, ...result };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("insufficient_balance")) return { ok: false, reason: "insufficient_balance" };
        return { ok: false, reason: msg };
    }
}

/** Do'kon hozir premium'mi (endsAt > now). */
export function isPremiumActive(shop: { premiumUntil: Date | null }): boolean {
    return !!(shop.premiumUntil && shop.premiumUntil > new Date());
}
