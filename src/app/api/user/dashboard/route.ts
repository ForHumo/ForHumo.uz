// Universal foydalanuvchi dashboard — barcha modul birlashtirilgan holat.
//
//   GET /api/user/dashboard
//
// Har modul uchun: aktiv sonlar, oxirgi holat, quick counter.
// Faqat kirgan foydalanuvchi o'z ma'lumotlari.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, username: true, humoId: true, image: true },
    });
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

    // Achievement: birinchi marta dashboard ochish
    try {
        const { grantAchievement } = await import("@/lib/achievements");
        void grantAchievement(profile.id, "humo.dashboard_first");
    } catch { /* skip */ }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const [
        wallet,
        bnActiveOrders,
        bnMonthSpent,
        bnShop,
        marketActiveOrders,
        belisActiveBookings,
        nexusUnreadDM,
        nexusUnreadNotif,
        supportOpenTickets,
        recentPayTx,
    ] = await Promise.all([
        prisma.wallet.findUnique({
            where: { profileId: profile.id },
            select: { balance: true, currency: true },
        }),
        prisma.bnOrder.count({
            where: {
                buyerId: profile.id,
                status: { in: ["PLACED", "CONFIRMED", "READY"] },
            },
        }),
        prisma.bnOrder.aggregate({
            where: {
                buyerId: profile.id,
                placedAt: { gte: monthStart },
                status: { in: ["COMPLETED", "READY", "CONFIRMED", "PLACED"] },
            },
            _sum: { total: true },
        }),
        prisma.bnShop.findFirst({
            where: { profileId: profile.id },
            select: { id: true, status: true, name: true, slug: true, orderCount: true },
        }),
        prisma.marketOrder.count({
            where: {
                profileId: profile.id,
                status: { in: ["PENDING", "PAID", "PROCESSING", "SHIPPED"] },
            },
        }).catch(() => 0),
        prisma.belisRentalBooking.count({
            where: {
                buyerId: profile.id,
                status: { in: ["REQUESTED", "CONFIRMED", "PICKED_UP"] },
            },
        }).catch(() => 0),
        // Nexus unread DM count (has unread messages)
        prisma.nexusConversation.count({
            where: {
                OR: [
                    { user1Id: profile.id, user1ReadAt: null },
                    { user2Id: profile.id, user2ReadAt: null },
                ],
                lastSenderId: { not: profile.id },
            },
        }).catch(() => 0),
        prisma.nexusNotification.count({
            where: { recipientId: profile.id, read: false },
        }).catch(() => 0),
        prisma.supportTicket.count({
            where: {
                profileId: profile.id,
                status: { in: ["open", "pending"] },
            },
        }),
        prisma.walletTransaction.findMany({
            where: { wallet: { profileId: profile.id } },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { id: true, type: true, amount: true, description: true, createdAt: true, currency: true },
        }).catch(() => []),
    ]);

    // Sotuvchi sifatida bo'lsa qo'shimcha stat
    let sellerStats = null;
    if (bnShop?.status === "APPROVED") {
        const [monthSalesAgg, activeSellerOrders, unreadInsight] = await Promise.all([
            prisma.bnOrder.aggregate({
                where: {
                    shopId: bnShop.id,
                    status: "COMPLETED",
                    completedAt: { gte: monthStart },
                },
                _sum: { total: true, commission: true },
                _count: { _all: true },
            }),
            prisma.bnOrder.count({
                where: {
                    shopId: bnShop.id,
                    status: { in: ["PLACED", "CONFIRMED", "READY"] },
                },
            }),
            prisma.bnSellerInsight.count({
                where: { shopId: bnShop.id, seenAt: null, createdAt: { gte: weekAgo } },
            }),
        ]);
        sellerStats = {
            monthRevenue: (monthSalesAgg._sum.total ?? 0) - (monthSalesAgg._sum.commission ?? 0),
            monthOrders: monthSalesAgg._count._all,
            activeOrders: activeSellerOrders,
            unreadInsights: unreadInsight,
        };
    }

    return NextResponse.json({
        profile: {
            id: profile.id,
            name: profile.name,
            username: profile.username,
            humoId: profile.humoId,
            image: profile.image,
        },
        modules: {
            pay: {
                balance: Number(wallet?.balance ?? 0),
                currency: wallet?.currency ?? "UZS",
                recent: recentPayTx.map(t => ({
                    id: t.id,
                    type: t.type,
                    amount: Number(t.amount),
                    currency: t.currency,
                    description: t.description,
                    at: t.createdAt.toISOString(),
                })),
            },
            bn: {
                activeOrders: bnActiveOrders,
                monthSpent: bnMonthSpent._sum.total ?? 0,
                hasShop: !!bnShop,
                shopStatus: bnShop?.status ?? null,
                shopName: bnShop?.name ?? null,
                shopSlug: bnShop?.slug ?? null,
                sellerStats,
            },
            market: {
                activeOrders: marketActiveOrders,
            },
            belis: {
                activeBookings: belisActiveBookings,
            },
            nexus: {
                unreadDM: nexusUnreadDM,
                unreadNotif: nexusUnreadNotif,
            },
            support: {
                openTickets: supportOpenTickets,
            },
        },
        timestamp: now.toISOString(),
    });
}
