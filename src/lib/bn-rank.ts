// BN mahsulot rank funksiyasi — foydalanuvchi qiziqishi asosida ball.
// Cold start (interest yo'q) uchun trend/reyting fallback.

import { prisma } from "@/lib/prisma";
import type { BnProduct, BnCategory, BnShop, BnInterest } from "@prisma/client";

export type RankableProduct = BnProduct & {
    category: Pick<BnCategory, "slug" | "parentId"> & { parent?: { slug: string } | null } | null;
    shop: (Pick<BnShop, "id" | "slug" | "name" | "tier" | "marketId" | "city"> & {
        market: { name: string } | null;
    }) | null;
};

interface InterestVec {
    categoryScores: Record<string, number>;
    shopScores: Record<string, number>;
    marketScores: Record<string, number>;
    attrScores: Record<string, number>;
    avgPrice: number | null;
}

function loadInterest(row: BnInterest | null): InterestVec | null {
    if (!row) return null;
    return {
        categoryScores: (row.categoryScores as Record<string, number>) ?? {},
        shopScores: (row.shopScores as Record<string, number>) ?? {},
        marketScores: (row.marketScores as Record<string, number>) ?? {},
        attrScores: (row.attrScores as Record<string, number>) ?? {},
        avgPrice: row.avgPrice ?? null,
    };
}

/**
 * Bitta mahsulot uchun rank ball.
 * Ball qanchalik yuqori bo'lsa, foydalanuvchi uchun shunchalik mos.
 */
export function scoreProduct(p: RankableProduct, interest: InterestVec | null): number {
    let score = 0;

    // Bazaviy: reyting × log(count) — sifat signal
    score += (p.rating || 0) * Math.log((p.ratingCount || 0) + 1) * 2;

    // Sotilgan (sold) — ijtimoiy proof
    score += Math.log((p.sold || 0) + 1) * 1.5;

    // Arzon bonus: bozor o'rtachasidan pastroq
    if (p.marketAvgPrice && p.marketAvgPrice > p.price) {
        const discount = (p.marketAvgPrice - p.price) / p.marketAvgPrice;
        score += Math.min(discount * 5, 3); // maks 3 ball
    }

    // Do'kon tier
    if (p.shop) {
        if (p.shop.tier === "PREMIUM") score += 2;
        else if (p.shop.tier === "VERIFIED") score += 1;
        else if (p.shop.tier === "TRUSTED") score += 0.5;
    }

    // Yangilik decay — oxirgi 30 kunda yaratilgan bo'lsa bonus
    const ageDays = (Date.now() - new Date(p.createdAt).getTime()) / 86400_000;
    if (ageDays < 30) score += (30 - ageDays) / 30 * 1.5; // maks 1.5 ball

    // 18+ mahsulot — kamroq (asosiy oqim uchun)
    if (p.isMature) score -= 3;

    // Personalizatsiya (agar interest bor bo'lsa)
    if (interest) {
        // Kategoriya moslik
        const catSlug = p.category?.slug;
        const catParent = p.category?.parent?.slug;
        if (catSlug && interest.categoryScores[catSlug]) {
            score += Math.min(interest.categoryScores[catSlug] * 0.3, 5); // maks 5 ball
        }
        if (catParent && interest.categoryScores[catParent]) {
            score += Math.min(interest.categoryScores[catParent] * 0.15, 2.5);
        }

        // Do'kon moslik
        if (p.shop?.id && interest.shopScores[p.shop.id]) {
            score += Math.min(interest.shopScores[p.shop.id] * 0.4, 4);
        }
        // Bozor moslik
        if (p.shop?.marketId && interest.marketScores[p.shop.marketId]) {
            score += Math.min(interest.marketScores[p.shop.marketId] * 0.2, 2);
        }

        // Narx moslik (foydalanuvchi o'rtacha narx bilan farqi qancha kam bo'lsa shuncha yaxshi)
        if (interest.avgPrice && p.price > 0) {
            const diff = Math.abs(p.price - interest.avgPrice) / interest.avgPrice;
            if (diff < 0.5) score += (0.5 - diff) * 3; // yaqinroq bo'lsa maks 1.5 ball
        }

        // Atribut moslik (brand, model)
        if (p.attributes && typeof p.attributes === "object") {
            const attrs = p.attributes as Record<string, unknown>;
            for (const [k, v] of Object.entries(attrs)) {
                if (typeof v === "string") {
                    const key = `${k}:${v}`;
                    if (interest.attrScores[key]) {
                        score += Math.min(interest.attrScores[key] * 0.2, 2);
                    }
                }
            }
        }
    } else {
        // Cold start — narxlar bilan shovqin oldini olish uchun rassional bonus
        // Yuqori sold + rating asos qiladi (bazaviy score allaqachon)
    }

    return score;
}

/** Foydalanuvchi qiziqishini bir marta oladi (rank ishlatishdan oldin) */
export async function getUserInterest(profileId: string | null): Promise<InterestVec | null> {
    if (!profileId) return null;
    const row = await prisma.bnInterest.findUnique({ where: { profileId } });
    return loadInterest(row);
}
