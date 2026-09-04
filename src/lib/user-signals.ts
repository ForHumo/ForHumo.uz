// Cross-modul foydalanuvchi signallari agregatori.
// Kunlik cron (yoki lazy on-demand) hisoblab UserSignals ga yozadi.
// AI kontexti uchun ishlatiladi — foydalanuvchining haqiqiy harakati.

import { prisma } from "@/lib/prisma";

const RECENT_DAYS = 30;

export interface AggregatedSignals {
    nexusFollows: number;
    nexusPostsLiked: number;
    nexusVideosSeen: number;
    marketOrders: number;
    marketCategories: string[];
    bnCategoryClicks: string[];
    belisBookings: number;
    payTransfers: number;
    topDmContacts: string[];
    topFollowedAuthors: string[];
    lastAggregatedAt: Date;
}

/** Foydalanuvchining hozirgi signallarini olib beradi (cache'lash — DB'dan). */
export async function getUserSignals(profileId: string): Promise<AggregatedSignals | null> {
    const row = await prisma.userSignals.findUnique({ where: { profileId } });
    if (!row) return null;
    return {
        nexusFollows: row.nexusFollows,
        nexusPostsLiked: row.nexusPostsLiked,
        nexusVideosSeen: row.nexusVideosSeen,
        marketOrders: row.marketOrders,
        marketCategories: Array.isArray(row.marketCategories) ? row.marketCategories as string[] : [],
        bnCategoryClicks: Array.isArray(row.bnCategoryClicks) ? row.bnCategoryClicks as string[] : [],
        belisBookings: row.belisBookings,
        payTransfers: row.payTransfers,
        topDmContacts: Array.isArray(row.topDmContacts) ? row.topDmContacts as string[] : [],
        topFollowedAuthors: Array.isArray(row.topFollowedAuthors) ? row.topFollowedAuthors as string[] : [],
        lastAggregatedAt: row.lastAggregatedAt,
    };
}

/**
 * Signallarni hisoblab UserSignals'ga yozadi. Fail-safe.
 * Ishlatish:
 *   - Har kuni cron chaqiradi
 *   - Yoki AI so'rovi ichida (agar oxirgi aggregation eskirgan bo'lsa)
 */
export async function aggregateUserSignals(profileId: string): Promise<AggregatedSignals | null> {
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

    try {
        const [
            nexusFollowsCount,
            nexusLikesCount,
            nexusVideosSeenCount,
            marketOrdersCount,
            marketOrderItems,
            belisBookingsCount,
            payTransfersCount,
            topDmRows,
            topFollowsRows,
            // BN events (oxirgi 30 kun)
            bnEvents,
        ] = await Promise.all([
            prisma.nexusFollow.count({ where: { followerId: profileId } }).catch(() => 0),
            prisma.nexusLike.count({ where: { profileId, createdAt: { gt: since } } }).catch(() => 0),
            prisma.nexusVideoView.count({ where: { profileId, createdAt: { gt: since } } }).catch(() => 0),
            prisma.marketOrder.count({ where: { profileId: profileId } }).catch(() => 0),
            // Market kategoriyalari
            prisma.marketOrderItem.findMany({
                where: { order: { profileId } },
                include: { product: { include: { brand: { select: { categories: true } } } } },
                take: 100,
            }).catch(() => []),
            prisma.belisRentalBooking.count({ where: { buyerId: profileId } }).catch(() => 0),
            prisma.walletTransaction.count({
                where: { wallet: { profileId }, type: "TRANSFER_OUT", createdAt: { gt: since } },
            }).catch(() => 0),
            // Top DM kontaktlar (kimga eng ko'p yozdim) — oxirgi 30 kun
            prisma.nexusMessage.groupBy({
                by: ["conversationId"],
                where: { senderId: profileId, createdAt: { gt: since } },
                _count: { _all: true },
                orderBy: { _count: { conversationId: "desc" } },
                take: 5,
            }).catch(() => []),
            // Top followed authors — id list (username'ni keyin olamiz)
            prisma.nexusFollow.findMany({
                where: { followerId: profileId },
                select: { followingId: true },
                take: 20,
            }).catch(() => []),
            // BN top qaralgan mahsulotlar (productId — kategoriya keyin olinadi)
            prisma.bnUserEvent.groupBy({
                by: ["productId"],
                where: { profileId, createdAt: { gt: since } },
                _count: { _all: true },
                orderBy: { _count: { productId: "desc" } },
                take: 20,
            }).catch(() => []),
        ]);

        // Market kategoriyalar — flatten + count
        const catMap = new Map<string, number>();
        for (const it of marketOrderItems) {
            const cats = it.product?.brand?.categories ?? [];
            for (const c of cats) catMap.set(c, (catMap.get(c) ?? 0) + 1);
        }
        const marketCategories = [...catMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([c]) => c);

        // Top DM: conversation ID'lardan boshqa userni topamiz
        const convIds = topDmRows.map(r => r.conversationId);
        const convs = convIds.length ? await prisma.nexusConversation.findMany({
            where: { id: { in: convIds } },
            select: { id: true, user1Id: true, user2Id: true },
        }).catch(() => []) : [];
        const otherIds = convs.map(c => c.user1Id === profileId ? c.user2Id : c.user1Id);
        const others = otherIds.length ? await prisma.userProfile.findMany({
            where: { id: { in: otherIds } },
            select: { username: true },
        }).catch(() => []) : [];
        const topDmContacts = others.map(o => o.username).filter(Boolean) as string[];

        // Top followed usernames — id list'dan username olamiz
        const followIds = topFollowsRows.map(f => f.followingId);
        const followUsers = followIds.length ? await prisma.userProfile.findMany({
            where: { id: { in: followIds } },
            select: { username: true },
        }).catch(() => []) : [];
        const topFollowedAuthors = followUsers.map(u => u.username).filter(Boolean).slice(0, 10) as string[];

        // BN eng ko'p qaralgan mahsulotlar → kategoriyalarga aggregate
        const bnProductIds = bnEvents.map(e => e.productId);
        const bnProducts = bnProductIds.length ? await prisma.bnProduct.findMany({
            where: { id: { in: bnProductIds } },
            select: { category: { select: { slug: true } } },
        }).catch(() => []) : [];
        const bnCatSet = new Set<string>();
        for (const p of bnProducts) {
            if (p.category?.slug) bnCatSet.add(p.category.slug);
        }
        const bnCategoryClicks = [...bnCatSet].slice(0, 10);

        const now = new Date();
        await prisma.userSignals.upsert({
            where: { profileId },
            create: {
                profileId,
                nexusFollows: nexusFollowsCount,
                nexusPostsLiked: nexusLikesCount,
                nexusVideosSeen: nexusVideosSeenCount,
                marketOrders: marketOrdersCount,
                marketCategories,
                bnCategoryClicks,
                belisBookings: belisBookingsCount,
                payTransfers: payTransfersCount,
                topDmContacts,
                topFollowedAuthors,
                lastAggregatedAt: now,
            },
            update: {
                nexusFollows: nexusFollowsCount,
                nexusPostsLiked: nexusLikesCount,
                nexusVideosSeen: nexusVideosSeenCount,
                marketOrders: marketOrdersCount,
                marketCategories,
                bnCategoryClicks,
                belisBookings: belisBookingsCount,
                payTransfers: payTransfersCount,
                topDmContacts,
                topFollowedAuthors,
                lastAggregatedAt: now,
            },
        });

        return {
            nexusFollows: nexusFollowsCount,
            nexusPostsLiked: nexusLikesCount,
            nexusVideosSeen: nexusVideosSeenCount,
            marketOrders: marketOrdersCount,
            marketCategories,
            bnCategoryClicks,
            belisBookings: belisBookingsCount,
            payTransfers: payTransfersCount,
            topDmContacts,
            topFollowedAuthors,
            lastAggregatedAt: now,
        };
    } catch (e) {
        console.error("aggregateUserSignals failed:", e);
        return null;
    }
}

/** Signallar eskirgan bo'lsa (>24 soat) yangilash. Lazy on-demand chaqiruv uchun. */
export async function getOrRefreshSignals(profileId: string): Promise<AggregatedSignals | null> {
    const existing = await getUserSignals(profileId);
    const oneDay = 24 * 60 * 60 * 1000;
    if (existing && Date.now() - existing.lastAggregatedAt.getTime() < oneDay) {
        return existing;
    }
    return aggregateUserSignals(profileId);
}
