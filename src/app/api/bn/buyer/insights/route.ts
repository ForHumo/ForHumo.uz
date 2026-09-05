// Xaridor kabinet dashboard — bu oy statistika + kategoriya + tavsiya.
//
//   GET /api/bn/buyer/insights
//
// Faqat kirgan foydalanuvchining o'z ma'lumotlari.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [thisMonth, lastMonth, allOrders, favCount, watchCount] = await Promise.all([
        prisma.bnOrder.aggregate({
            where: {
                buyerId: auth.profileId,
                status: { in: ["COMPLETED", "READY", "CONFIRMED", "PLACED"] },
                placedAt: { gte: monthStart },
            },
            _count: { _all: true },
            _sum: { total: true },
        }),
        prisma.bnOrder.aggregate({
            where: {
                buyerId: auth.profileId,
                status: { in: ["COMPLETED", "READY", "CONFIRMED", "PLACED"] },
                placedAt: { gte: prevMonthStart, lte: prevMonthEnd },
            },
            _count: { _all: true },
            _sum: { total: true },
        }),
        prisma.bnOrder.count({ where: { buyerId: auth.profileId } }),
        prisma.bnFavorite.count({ where: { profileId: auth.profileId } }),
        prisma.bnPriceWatch.count({ where: { profileId: auth.profileId } }),
    ]);

    // Kategoriya breakdown (bu oy)
    const orderItems = await prisma.bnOrderItem.findMany({
        where: {
            order: {
                buyerId: auth.profileId,
                placedAt: { gte: monthStart },
                status: { in: ["COMPLETED", "READY", "CONFIRMED", "PLACED"] },
            },
        },
        select: {
            qty: true, price: true, title: true,
            product: { select: { category: { select: { slug: true, name: true } } } },
        },
    });
    const catMap = new Map<string, { name: string; slug: string; total: number; qty: number }>();
    for (const it of orderItems) {
        const cat = it.product?.category;
        if (!cat) continue;
        const row = catMap.get(cat.slug) || { name: cat.name, slug: cat.slug, total: 0, qty: 0 };
        row.total += it.price * it.qty;
        row.qty += it.qty;
        catMap.set(cat.slug, row);
    }
    const categoryBreakdown = [...catMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    // Ko'p oladigan mahsulotlar (barcha vaqt)
    const allItems = await prisma.bnOrderItem.findMany({
        where: { order: { buyerId: auth.profileId, status: "COMPLETED" } },
        select: { title: true, productId: true, qty: true, price: true, imageUrl: true },
        take: 500,
        orderBy: { order: { placedAt: "desc" } },
    });
    const prodMap = new Map<string, { title: string; productId: string; imageUrl: string | null; qty: number; times: number; lastPrice: number }>();
    for (const it of allItems) {
        const r = prodMap.get(it.productId) || { title: it.title, productId: it.productId, imageUrl: it.imageUrl, qty: 0, times: 0, lastPrice: it.price };
        r.qty += it.qty;
        r.times += 1;
        prodMap.set(it.productId, r);
    }
    const frequentBuys = [...prodMap.values()].filter(r => r.times >= 2).sort((a, b) => b.times - a.times).slice(0, 8);

    // Trend
    const thisTotal = thisMonth._sum.total ?? 0;
    const lastTotal = lastMonth._sum.total ?? 0;
    const diff = thisTotal - lastTotal;
    const trendPct = lastTotal > 0 ? Math.round((diff / lastTotal) * 100) : (thisTotal > 0 ? 100 : 0);

    // Xaridor uchun tavsiya (deterministic — favorit mahsulotlar chegirmasi)
    // BnFavorite'da `product` relation yo'q, alohida yuklaymiz
    const favRows = await prisma.bnFavorite.findMany({
        where: { profileId: auth.profileId },
        select: { productId: true },
        take: 30,
    });
    const favProductIds = favRows.map(r => r.productId);
    const favProductRows = favProductIds.length > 0 ? await prisma.bnProduct.findMany({
        where: { id: { in: favProductIds } },
        select: {
            id: true, slug: true, title: true, images: true,
            price: true, oldPrice: true, marketAvgPrice: true,
            shop: { select: { name: true, slug: true } },
        },
    }) : [];
    const dealsFromFavs = favProductRows
        .filter(p => {
            return (p.oldPrice && p.oldPrice > p.price) ||
                   (p.marketAvgPrice && p.marketAvgPrice > 0 && p.price < p.marketAvgPrice * 0.9);
        })
        .slice(0, 5);

    return NextResponse.json({
        summary: {
            thisMonthTotal: thisTotal,
            thisMonthOrders: thisMonth._count._all,
            lastMonthTotal: lastTotal,
            trendPct,
            allTimeOrders: allOrders,
            favoriteCount: favCount,
            watchCount,
        },
        categoryBreakdown,
        frequentBuys,
        dealsFromFavs: dealsFromFavs.map(p => ({
            productId: p.id, slug: p.slug, title: p.title,
            image: p.images[0] || null,
            price: p.price, oldPrice: p.oldPrice, marketAvgPrice: p.marketAvgPrice,
            shopName: p.shop?.name, shopSlug: p.shop?.slug,
        })),
    });
}
