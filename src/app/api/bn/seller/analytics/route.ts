// Sotuvchi tahlil endpointi — 5 reyting + dashboard raqamlari.
//
//   GET /api/bn/seller/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Standard oynasi: joriy oy boshidan bugungacha (from/to yo'q bo'lsa).
// Faqat COMPLETED buyurtmalar hisoblanadi (haqiqiy sotuv).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

interface RankRow {
    productId: string;
    title: string;
    imageUrl: string | null;
    soldQty: number;
    revenue: number;
    orders: number;
}

function parseDate(s: string | null, fallback: Date): Date {
    if (!s) return fallback;
    const d = new Date(s + "T00:00:00.000Z");
    return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId },
        select: { id: true, status: true, name: true, productCount: true },
    });
    if (!shop) return NextResponse.json({ error: "no_shop" }, { status: 404 });
    if (shop.status !== "APPROVED") {
        return NextResponse.json({ error: "shop_not_approved", status: shop.status }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const from = parseDate(searchParams.get("from"), monthStart);
    const to = parseDate(searchParams.get("to"), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)));

    // Barcha buyurtma item'lari (COMPLETED) shu davrda
    const items = await prisma.bnOrderItem.findMany({
        where: {
            order: {
                shopId: shop.id,
                status: "COMPLETED",
                completedAt: { gte: from, lte: to },
            },
        },
        select: {
            productId: true,
            title: true,
            price: true,
            qty: true,
            imageUrl: true,
            orderId: true,
        },
    });

    // Buyurtma darajasidagi agregatsiya (tushum sotuvchiga)
    const orderIds = new Set(items.map(i => i.orderId));
    const orders = await prisma.bnOrder.findMany({
        where: { id: { in: [...orderIds] } },
        select: { id: true, subtotal: true, commission: true, total: true, buyerId: true, placedAt: true, completedAt: true },
    });

    const totalRevenue = orders.reduce((s, o) => s + (o.subtotal - o.commission), 0);
    const totalOrders = orders.length;
    const totalItems = items.reduce((s, i) => s + i.qty, 0);
    const uniqueBuyers = new Set(orders.map(o => o.buyerId)).size;
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Product-level agregatsiya
    const rowMap = new Map<string, RankRow>();
    for (const it of items) {
        const key = it.productId;
        const row = rowMap.get(key) || {
            productId: it.productId,
            title: it.title,
            imageUrl: it.imageUrl,
            soldQty: 0,
            revenue: 0,
            orders: 0,
        };
        row.soldQty += it.qty;
        row.revenue += it.price * it.qty;
        row.orders += 1;
        rowMap.set(key, row);
    }
    const sold = [...rowMap.values()];

    // 5 reyting
    const topSold  = [...sold].sort((a, b) => b.soldQty - a.soldQty).slice(0, 20);
    const topRev   = [...sold].sort((a, b) => b.revenue - a.revenue).slice(0, 20);
    const lowSold  = [...sold].filter(r => r.soldQty > 0).sort((a, b) => a.soldQty - b.soldQty).slice(0, 20);
    const lowRev   = [...sold].filter(r => r.revenue > 0).sort((a, b) => a.revenue - b.revenue).slice(0, 20);

    // Umuman sotilmagan — do'kondagi barcha aktiv mahsulotlardan, sotilganlarni ayirib
    const soldIds = new Set(sold.map(r => r.productId));
    const unsoldProducts = await prisma.bnProduct.findMany({
        where: {
            shopId: shop.id,
            isActive: true,
            hidden: false,
            id: { notIn: [...soldIds].length > 0 ? [...soldIds] : ["_none_"] },
        },
        select: {
            id: true,
            title: true,
            images: true,
            price: true,
            stock: true,
            createdAt: true,
            views: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    // Sotuvchi uchun "eskisi" ogohlantirish — 30 kundan ortiq sotuvi yo'q
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const staleCount = unsoldProducts.filter(p => p.createdAt < thirtyDaysAgo).length;

    // Bu davrda umumiy ko'rilishlar (product views ⇒ konversiya)
    // BnUserEvent'da `product` relation yo'q — avval do'kon mahsulot ID'larini olamiz.
    const shopProductIds = await prisma.bnProduct.findMany({
        where: { shopId: shop.id },
        select: { id: true },
    });
    const productIdList = shopProductIds.map(p => p.id);
    const viewsCount = productIdList.length > 0
        ? await prisma.bnUserEvent.count({
            where: {
                type: "VIEW",
                createdAt: { gte: from, lte: to },
                productId: { in: productIdList },
            },
        })
        : 0;
    const totalViews = viewsCount;
    const conversionPct = totalViews > 0 ? +((totalItems / totalViews) * 100).toFixed(1) : 0;

    // AI kunlik tavsiya (bo'lsa — oxirgi kunlik)
    const latestInsight = await prisma.bnSellerInsight.findFirst({
        where: { shopId: shop.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, items: true, aiSummary: true, createdAt: true, seenAt: true },
    });

    return NextResponse.json({
        shop: { id: shop.id, name: shop.name, productCount: shop.productCount },
        period: { from: from.toISOString(), to: to.toISOString() },
        summary: {
            totalRevenue,
            totalOrders,
            totalItems,
            uniqueBuyers,
            avgOrder,
            totalViews,
            conversionPct,
            staleCount,
            unsoldCount: unsoldProducts.length,
        },
        rankings: {
            topSold,
            topRevenue: topRev,
            lowSold,
            lowRevenue: lowRev,
            unsold: unsoldProducts.map(p => ({
                productId: p.id,
                title: p.title,
                imageUrl: p.images[0] || null,
                price: p.price,
                stock: p.stock,
                views: p.views,
                daysSinceCreated: Math.floor((now.getTime() - p.createdAt.getTime()) / 86400000),
            })),
        },
        insight: latestInsight ? {
            id: latestInsight.id,
            items: latestInsight.items,
            aiSummary: latestInsight.aiSummary,
            createdAt: latestInsight.createdAt.toISOString(),
            seen: !!latestInsight.seenAt,
        } : null,
    });
}
