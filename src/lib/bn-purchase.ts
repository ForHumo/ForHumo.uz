// BN xarid yordamchilari — auto-record, cheapest match, birthday tavsiya.

import { prisma } from "@/lib/prisma";
import { estimateExpiresAt } from "@/lib/bn-shelf-life";

export interface CheapestMatch {
    productId: string;
    slug: string;
    title: string;
    price: number;
    shopName: string;
    marketName: string | null;
    url: string;
    savings: number;      // eski narxdan farq (musbat)
    percentOff: number;
}

/**
 * Buyurtma COMPLETED bo'lganda uning har buyurtma-satri uchun BnPurchase yaratadi.
 * Idempotent — bir orderId bo'yicha ikkinchi marta chaqirsak ham dublikat yaratmaydi.
 */
export async function recordPurchaseFromOrder(orderId: string): Promise<number> {
    const order = await prisma.bnOrder.findUnique({
        where: { id: orderId },
        include: {
            items: true,
            shop: { select: { id: true } },
        },
    });
    if (!order) return 0;

    const existing = await prisma.bnPurchase.count({
        where: { orderId, source: "ONLINE_ORDER" },
    });
    if (existing > 0) return 0;

    let created = 0;
    for (const item of order.items) {
        const product = item.productId
            ? await prisma.bnProduct.findUnique({
                where: { id: item.productId },
                select: { title: true, category: { select: { slug: true } } },
            })
            : null;
        const title = product?.title ?? item.title ?? "Mahsulot";
        const categorySlug = product?.category?.slug ?? null;
        const purchasedAt = order.completedAt ?? new Date();
        const expiresAt = estimateExpiresAt(title, categorySlug, purchasedAt);

        await prisma.bnPurchase.create({
            data: {
                profileId: order.buyerId,
                shopId: order.shopId,
                productId: item.productId,
                title,
                categorySlug,
                quantity: item.qty,
                unit: null,
                priceUzs: item.price,
                purchasedAt,
                expiresAt,
                source: "ONLINE_ORDER",
                orderId,
            },
        });
        created++;
    }
    return created;
}

/**
 * Bir mahsulot uchun boshqa do'konlardagi eng arzon variantni topadi.
 * Same-title fuzzy match (contains) + narx boshqa mahsulotdan kam.
 */
export async function findCheapestMatch(
    title: string,
    excludeShopId: string | null,
    referencePrice: number,
): Promise<CheapestMatch | null> {
    // Nomdan asosiy kalitni oladi (birinchi ma'noli so'z)
    const key = extractKey(title);
    if (!key) return null;

    const results = await prisma.bnProduct.findMany({
        where: {
            isActive: true,
            hidden: false,
            title: { contains: key, mode: "insensitive" },
            ...(excludeShopId ? { NOT: { shopId: excludeShopId } } : {}),
            price: { lt: referencePrice, gt: 0 },
        },
        take: 3,
        orderBy: { price: "asc" },
        select: {
            id: true, slug: true, title: true, price: true,
            shop: { select: { name: true, market: { select: { name: true } } } },
        },
    });
    if (results.length === 0) return null;

    const best = results[0];
    const savings = referencePrice - best.price;
    const percentOff = Math.round((savings / referencePrice) * 100);
    return {
        productId: best.id,
        slug: best.slug,
        title: best.title,
        price: best.price,
        shopName: best.shop?.name ?? "",
        marketName: best.shop?.market?.name ?? null,
        url: `https://bozornarxida.uz/p/${best.slug}?utm_source=push&utm_medium=expiry`,
        savings,
        percentOff,
    };
}

function extractKey(title: string): string {
    // "Olma 5kg" → "olma"
    const words = title.toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !/^\d+$/.test(w));
    if (words.length === 0) return "";
    return words[0];
}
