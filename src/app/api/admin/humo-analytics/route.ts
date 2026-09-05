// Founder cross-modul analytics.
// Faqat founder (isFounderProfile) uchun. Barcha modul KPI + trend + top listlar.
//
//   GET /api/admin/humo-analytics?days=7
//
// Har chaqiruv juda ko'p count/aggregate qiladi — 60s cache tavsiya etiladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "founder_required" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const days = Math.min(30, Math.max(1, Number(searchParams.get("days")) || 7));
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        // Users
        totalUsers, newUsersInPeriod, activeUsers,
        // Nexus
        totalPosts, newPosts, totalDM, newDM,
        // BN
        totalShops, approvedShops, pendingShops, totalBnOrders, newBnOrders, bnRevenue,
        // Belis
        totalBookings, newBookings,
        // Market
        totalMarketOrders, newMarketOrders,
        // Support
        openTickets, newTickets, aiHandledTickets,
        // Waitlist
        bnWaitlist, urgentWaitlist,
        // Wallet
        totalWallets, totalDeposits,
        // Top lists
        topShops, topProductsWeek, activeSellersWeek,
    ] = await Promise.all([
        prisma.userProfile.count(),
        prisma.userProfile.count({ where: { createdAt: { gte: since } } }),
        prisma.userProfile.count({ where: { lastSeenAt: { gte: since } } }).catch(() => 0),

        prisma.nexusPost.count().catch(() => 0),
        prisma.nexusPost.count({ where: { createdAt: { gte: since } } }).catch(() => 0),
        prisma.nexusMessage.count().catch(() => 0),
        prisma.nexusMessage.count({ where: { createdAt: { gte: since } } }).catch(() => 0),

        prisma.bnShop.count(),
        prisma.bnShop.count({ where: { status: "APPROVED" } }),
        prisma.bnShop.count({ where: { status: "PENDING" } }),
        prisma.bnOrder.count(),
        prisma.bnOrder.count({ where: { placedAt: { gte: since } } }),
        prisma.bnOrder.aggregate({
            where: { placedAt: { gte: monthStart }, status: "COMPLETED" },
            _sum: { total: true, commission: true },
        }),

        prisma.belisRentalBooking.count().catch(() => 0),
        prisma.belisRentalBooking.count({ where: { createdAt: { gte: since } } }).catch(() => 0),

        prisma.marketOrder.count().catch(() => 0),
        prisma.marketOrder.count({ where: { createdAt: { gte: since } } }).catch(() => 0),

        prisma.supportTicket.count({ where: { status: { in: ["open", "pending"] } } }),
        prisma.supportTicket.count({ where: { createdAt: { gte: since } } }),
        prisma.supportTicket.count({ where: { aiHandled: true } }),

        prisma.bnSellerWaitlist.count().catch(() => 0),
        prisma.bnSellerWaitlist.count({
            where: {
                status: "PENDING",
                createdAt: { lt: new Date(Date.now() - 3 * 86400000) },
            },
        }).catch(() => 0),

        prisma.wallet.count().catch(() => 0),
        prisma.walletTransaction.aggregate({
            where: { type: "DEPOSIT", createdAt: { gte: monthStart } },
            _sum: { amount: true },
        }).catch(() => ({ _sum: { amount: null } })),

        prisma.bnShop.findMany({
            where: { status: "APPROVED" },
            orderBy: { orderCount: "desc" },
            take: 8,
            select: { id: true, slug: true, name: true, orderCount: true, rating: true, ratingCount: true, tier: true },
        }),
        prisma.bnOrderItem.groupBy({
            by: ["productId"],
            where: { order: { placedAt: { gte: since }, status: "COMPLETED" } },
            _sum: { qty: true },
            orderBy: { _sum: { qty: "desc" } },
            take: 8,
        }).catch(() => []),
        prisma.bnOrder.groupBy({
            by: ["shopId"],
            where: { placedAt: { gte: since }, status: "COMPLETED" },
            _count: { _all: true },
            _sum: { total: true },
            orderBy: { _sum: { total: "desc" } },
            take: 8,
        }).catch(() => []),
    ]);

    // Enrich top products with titles
    const topProductIds = topProductsWeek.map(t => t.productId);
    const topProductInfo = topProductIds.length > 0 ? await prisma.bnProduct.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, slug: true, title: true, price: true, images: true, shop: { select: { name: true } } },
    }) : [];
    const topProducts = topProductsWeek.map(t => {
        const p = topProductInfo.find(x => x.id === t.productId);
        return {
            productId: t.productId,
            title: p?.title || "—",
            slug: p?.slug,
            imageUrl: p?.images[0] || null,
            price: p?.price ?? 0,
            shopName: p?.shop?.name || "—",
            soldQty: t._sum.qty ?? 0,
        };
    });

    const topSellerIds = activeSellersWeek.map(s => s.shopId);
    const topSellerInfo = topSellerIds.length > 0 ? await prisma.bnShop.findMany({
        where: { id: { in: topSellerIds } },
        select: { id: true, slug: true, name: true, tier: true },
    }) : [];
    const topSellers = activeSellersWeek.map(s => {
        const shop = topSellerInfo.find(x => x.id === s.shopId);
        return {
            shopId: s.shopId,
            name: shop?.name || "—",
            slug: shop?.slug,
            tier: shop?.tier,
            orders: s._count._all,
            revenue: s._sum.total ?? 0,
        };
    });

    // Kunlik trend (foydalanuvchi + buyurtma)
    const trend: { day: string; users: number; bnOrders: number; posts: number }[] = [];
    for (let i = 0; i < days; i++) {
        const dStart = new Date(now.getTime() - (days - 1 - i) * 86400000);
        dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(dStart.getTime() + 86400000);
        trend.push({ day: dStart.toISOString().slice(0, 10), users: 0, bnOrders: 0, posts: 0 });
    }
    const [dailyUsers, dailyBnOrders, dailyPosts] = await Promise.all([
        prisma.userProfile.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true },
        }),
        prisma.bnOrder.findMany({
            where: { placedAt: { gte: since } },
            select: { placedAt: true },
        }),
        prisma.nexusPost.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true },
        }).catch(() => []),
    ]);
    const trendIdx = new Map(trend.map((t, i) => [t.day, i]));
    for (const u of dailyUsers) {
        const k = u.createdAt.toISOString().slice(0, 10);
        const i = trendIdx.get(k);
        if (i !== undefined) trend[i].users++;
    }
    for (const o of dailyBnOrders) {
        const k = o.placedAt.toISOString().slice(0, 10);
        const i = trendIdx.get(k);
        if (i !== undefined) trend[i].bnOrders++;
    }
    for (const p of dailyPosts) {
        const k = p.createdAt.toISOString().slice(0, 10);
        const i = trendIdx.get(k);
        if (i !== undefined) trend[i].posts++;
    }

    return NextResponse.json({
        period: { days, from: since.toISOString(), to: now.toISOString() },
        users: { total: totalUsers, new: newUsersInPeriod, active: activeUsers },
        nexus: { totalPosts, newPosts, totalDM, newDM },
        bn: {
            totalShops, approvedShops, pendingShops,
            totalOrders: totalBnOrders, newOrders: newBnOrders,
            monthRevenue: bnRevenue._sum.total ?? 0,
            monthCommission: bnRevenue._sum.commission ?? 0,
            waitlist: bnWaitlist, urgentWaitlist,
        },
        belis: { totalBookings, newBookings },
        market: { totalOrders: totalMarketOrders, newOrders: newMarketOrders },
        support: { open: openTickets, new: newTickets, aiHandled: aiHandledTickets },
        wallet: { totalWallets, monthDeposits: Number(totalDeposits._sum.amount ?? 0) },
        topShops: topShops.map(s => ({
            shopId: s.id, slug: s.slug, name: s.name, orderCount: s.orderCount,
            rating: s.rating, ratingCount: s.ratingCount, tier: s.tier,
        })),
        topProducts,
        topSellers,
        trend,
    });
}
