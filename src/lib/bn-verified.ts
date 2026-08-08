// BN sotuvchi tasdiqlanganlik (galochka) — 5 kriteriya asosida avtomatik.
// Chakana (RETAIL) va Ulgurji (WHOLESALE) uchun alohida threshold'lar.
// Sotib olib bo'lmaydi — faqat haqiqiy natijaga qarab beriladi.

import { prisma } from "@/lib/prisma";

export type VerifiedCriteria = {
    orders: { current: number; target: number; ok: boolean };
    rating: { current: number; target: number; count: number; countTarget: number; ok: boolean };
    rejection: { current: number; target: number; ok: boolean };  // % — kam bo'lishi kerak
    activeDays: { current: number; target: number; ok: boolean };
    banFree: { ok: boolean };
};

export type VerifiedProgress = {
    tier: "NONE" | "RETAIL" | "WHOLESALE";
    retail: VerifiedCriteria & { qualified: boolean };
    wholesale: VerifiedCriteria & { qualified: boolean };
    uniqueBuyers?: { current: number; target: number; ok: boolean };  // ulgurji uchun
};

// Threshold'lar
const RETAIL = {
    orders: 50,
    rating: 4.7,
    ratingCount: 30,
    rejectionPct: 3,        // 3%dan kam
    activeDays: 90,
};

const WHOLESALE = {
    orders: 100,
    rating: 4.8,
    ratingCount: 50,
    rejectionPct: 2,
    activeDays: 180,
    uniqueBuyers: 20,
};

// Bitta do'kon uchun kriteriyalarni tekshiradi va tier qaytadi.
export async function computeShopVerification(shopId: string): Promise<VerifiedProgress> {
    const shop = await prisma.bnShop.findUnique({
        where: { id: shopId },
        select: {
            id: true,
            profileId: true,
            createdAt: true,
            rating: true,
            ratingCount: true,
            approvedAt: true,
        },
    });
    if (!shop) {
        return emptyProgress();
    }

    // Faol muddat — approvedAt bo'lsa shundan, aks holda createdAt
    const startedAt = shop.approvedAt ?? shop.createdAt;
    const activeDays = Math.floor((Date.now() - startedAt.getTime()) / 86400_000);

    // Buyurtmalar statistikasi (faqat shu do'kon)
    const [totalOrders, completedOrders, cancelledOrders, uniqueBuyers] = await Promise.all([
        prisma.bnOrder.count({ where: { shopId } }),
        prisma.bnOrder.count({ where: { shopId, status: "COMPLETED" } }),
        prisma.bnOrder.count({ where: { shopId, status: "CANCELLED" } }),
        prisma.bnOrder.findMany({
            where: { shopId, status: "COMPLETED" },
            select: { buyerId: true },
            distinct: ["buyerId"],
        }).then(r => r.length),
    ]);

    const rejectionPct = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Ogohlantirish/ban — oxirgi 6 oyda
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400_000);
    const banCount = await prisma.bnBan.count({
        where: {
            OR: [{ shopId }, { profileId: shop.profileId, scope: "PROFILE" }],
            createdAt: { gte: sixMonthsAgo },
        },
    });
    const banFree = banCount === 0;

    // RETAIL kriteriyalar
    const retail = {
        orders: { current: completedOrders, target: RETAIL.orders, ok: completedOrders >= RETAIL.orders },
        rating: {
            current: Number(shop.rating.toFixed(2)),
            target: RETAIL.rating,
            count: shop.ratingCount,
            countTarget: RETAIL.ratingCount,
            ok: shop.rating >= RETAIL.rating && shop.ratingCount >= RETAIL.ratingCount,
        },
        rejection: { current: Number(rejectionPct.toFixed(2)), target: RETAIL.rejectionPct, ok: rejectionPct < RETAIL.rejectionPct },
        activeDays: { current: activeDays, target: RETAIL.activeDays, ok: activeDays >= RETAIL.activeDays },
        banFree: { ok: banFree },
    };
    const retailQualified = retail.orders.ok && retail.rating.ok && retail.rejection.ok && retail.activeDays.ok && retail.banFree.ok;

    // WHOLESALE kriteriyalar (qiyinroq)
    const wholesale = {
        orders: { current: completedOrders, target: WHOLESALE.orders, ok: completedOrders >= WHOLESALE.orders },
        rating: {
            current: Number(shop.rating.toFixed(2)),
            target: WHOLESALE.rating,
            count: shop.ratingCount,
            countTarget: WHOLESALE.ratingCount,
            ok: shop.rating >= WHOLESALE.rating && shop.ratingCount >= WHOLESALE.ratingCount,
        },
        rejection: { current: Number(rejectionPct.toFixed(2)), target: WHOLESALE.rejectionPct, ok: rejectionPct < WHOLESALE.rejectionPct },
        activeDays: { current: activeDays, target: WHOLESALE.activeDays, ok: activeDays >= WHOLESALE.activeDays },
        banFree: { ok: banFree },
    };
    const uniqueBuyersBlock = { current: uniqueBuyers, target: WHOLESALE.uniqueBuyers, ok: uniqueBuyers >= WHOLESALE.uniqueBuyers };
    const wholesaleQualified = wholesale.orders.ok && wholesale.rating.ok && wholesale.rejection.ok && wholesale.activeDays.ok && wholesale.banFree.ok && uniqueBuyersBlock.ok;

    // Tier tanlash: WHOLESALE ustuvor (qiyinroq)
    const tier: VerifiedProgress["tier"] = wholesaleQualified ? "WHOLESALE" : retailQualified ? "RETAIL" : "NONE";

    return {
        tier,
        retail: { ...retail, qualified: retailQualified },
        wholesale: { ...wholesale, qualified: wholesaleQualified },
        uniqueBuyers: uniqueBuyersBlock,
    };
}

function emptyProgress(): VerifiedProgress {
    const empty = {
        orders: { current: 0, target: 0, ok: false },
        rating: { current: 0, target: 0, count: 0, countTarget: 0, ok: false },
        rejection: { current: 0, target: 0, ok: false },
        activeDays: { current: 0, target: 0, ok: false },
        banFree: { ok: false },
    };
    return {
        tier: "NONE",
        retail: { ...empty, qualified: false },
        wholesale: { ...empty, qualified: false },
    };
}

// Do'kon yozuvini yangilaydi (cron chaqiradi).
export async function recomputeShopVerified(shopId: string) {
    const progress = await computeShopVerification(shopId);
    const previous = await prisma.bnShop.findUnique({
        where: { id: shopId },
        select: { verifiedTier: true },
    });
    const newTier = progress.tier;
    const updates: {
        verifiedTier: typeof newTier;
        verifiedProgress: VerifiedProgress;
        verifiedAt?: Date | null;
    } = {
        verifiedTier: newTier,
        verifiedProgress: progress,
    };
    // Birinchi marta tier NONE'dan chiqsa — verifiedAt yozamiz.
    if (previous?.verifiedTier === "NONE" && newTier !== "NONE") {
        updates.verifiedAt = new Date();
    }
    // Yo'qotib qo'yilsa (masalan reyting tushib ketdi) — verifiedAt tozalanadi.
    if (previous?.verifiedTier !== "NONE" && newTier === "NONE") {
        updates.verifiedAt = null;
    }
    await prisma.bnShop.update({ where: { id: shopId }, data: updates });
    return { newTier, changed: previous?.verifiedTier !== newTier };
}
