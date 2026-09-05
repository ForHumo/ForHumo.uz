// Admin uchun bugungi API rate usage.
//
//   GET /api/admin/rate-usage

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
    const founder = await requireFounder();
    if (!founder) return NextResponse.json({ error: "founder_required" }, { status: 403 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
        aiUsageToday, aiUsageByKind, aiUsageTopUsers,
        broadcastsToday, feedbackToday, insightsToday,
    ] = await Promise.all([
        prisma.aiUsage.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
        prisma.aiUsage.groupBy({
            by: ["kind"],
            where: { createdAt: { gte: todayStart } },
            _count: { _all: true },
            orderBy: { _count: { kind: "desc" } },
            take: 10,
        }).catch(() => []),
        prisma.aiUsage.groupBy({
            by: ["profileId"],
            where: { createdAt: { gte: todayStart } },
            _count: { _all: true },
            orderBy: { _count: { profileId: "desc" } },
            take: 10,
        }).catch(() => []),
        prisma.bnBroadcast.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
        prisma.humoFeedback.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
        prisma.bnSellerInsight.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
    ]);

    // Top users enrich
    const topIds = aiUsageTopUsers.map(u => u.profileId);
    const topProfiles = topIds.length > 0 ? await prisma.userProfile.findMany({
        where: { id: { in: topIds } },
        select: { id: true, username: true, humoId: true, name: true },
    }) : [];
    const profileMap = new Map(topProfiles.map(p => [p.id, p.username || p.humoId || p.name || "—"]));

    return NextResponse.json({
        today: todayStart.toISOString(),
        ai: {
            totalToday: aiUsageToday,
            byKind: aiUsageByKind.map(k => ({ kind: k.kind, count: k._count._all })),
            topUsers: aiUsageTopUsers.map(u => ({
                actor: profileMap.get(u.profileId) || u.profileId.slice(0, 8),
                count: u._count._all,
            })),
        },
        broadcasts: { today: broadcastsToday, dailyLimit: 3 },
        feedback: { today: feedbackToday },
        sellerInsights: { today: insightsToday },
    });
}
