// BN admin dashboard — bir marta chaqirilib butun biznes holatini qaytaradi.
// OWNER/MODERATOR ko'radi. Yengil (parallel groupBy count'lar), 60 sek cache.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";
export const revalidate = 60;

async function isBnAdmin(profileId: string): Promise<boolean> {
    const a = await prisma.bnAdmin.findUnique({
        where: { profileId }, select: { role: true },
    });
    return a?.role === "OWNER" || a?.role === "MODERATOR";
}

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await isBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        waitlistByStatus, shopsByStatus, ordersByStatus,
        ordersToday, ordersWeek,
        waitlistToday, waitlistWeek,
        broadcastsToday, broadcastsWeek, broadcastAgg,
        referralByStatus, referralAgg,
        pushSubs,
    ] = await Promise.all([
        prisma.bnSellerWaitlist.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.bnShop.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.bnOrder.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.bnOrder.count({ where: { placedAt: { gte: dayAgo } } }),
        prisma.bnOrder.count({ where: { placedAt: { gte: weekAgo } } }),
        prisma.bnSellerWaitlist.count({ where: { createdAt: { gte: dayAgo } } }),
        prisma.bnSellerWaitlist.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.bnBroadcast.count({ where: { createdAt: { gte: dayAgo } } }),
        prisma.bnBroadcast.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.bnBroadcast.aggregate({
            where: { createdAt: { gte: weekAgo } },
            _sum: { recipients: true, clickCount: true },
        }),
        prisma.bnReferral.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.bnReferral.aggregate({
            where: { status: "REWARDED" },
            _sum: { inviterReward: true, inviteeReward: true },
        }),
        prisma.nexusPushSub.findMany({ select: { profileId: true }, distinct: ["profileId"] }),
    ]);

    const asMap = (rows: { status: string; _count: { _all: number } }[]) => {
        const m: Record<string, number> = {};
        for (const r of rows) m[r.status] = r._count._all;
        return m;
    };

    const weekRecipients = broadcastAgg._sum.recipients ?? 0;
    const weekClicks = broadcastAgg._sum.clickCount ?? 0;
    const weekCtr = weekRecipients > 0 ? Math.round((weekClicks / weekRecipients) * 1000) / 10 : 0;

    return NextResponse.json({
        waitlist: {
            byStatus: asMap(waitlistByStatus),
            today: waitlistToday,
            week: waitlistWeek,
        },
        shops: {
            byStatus: asMap(shopsByStatus),
        },
        orders: {
            byStatus: asMap(ordersByStatus),
            today: ordersToday,
            week: ordersWeek,
        },
        broadcasts: {
            today: broadcastsToday,
            week: broadcastsWeek,
            weekRecipients,
            weekClicks,
            weekCtr,
        },
        referrals: {
            byStatus: asMap(referralByStatus),
            rewardedTotal: (referralAgg._sum.inviterReward ?? 0) + (referralAgg._sum.inviteeReward ?? 0),
        },
        pushSubscribers: pushSubs.length,
    });
}
