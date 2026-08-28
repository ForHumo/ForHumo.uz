// GET /api/user/achievements — barcha modul yutuqlari (Nexus/Market/BN/ID/Pay/eSport)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ items: [], earnedCount: 0, totalCount: 0 });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ items: [], earnedCount: 0, totalCount: 0 });

    const earned = await prisma.userAchievement.findMany({
        where: { profileId: me.id },
        select: { code: true, earnedAt: true },
    }).catch(() => []);
    const earnedByCode = new Map(earned.map(e => [e.code, e.earnedAt]));
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Kategoriya bo'yicha guruhlangan
    const items = ACHIEVEMENTS.map(a => {
        const earnedAt = earnedByCode.get(a.code);
        return {
            code: a.code,
            title: a.title,
            description: a.description,
            icon: a.icon,
            category: a.category,
            tier: a.tier,
            earnedAt: earnedAt ? earnedAt.toISOString() : null,
            isNew: earnedAt ? earnedAt.getTime() > dayAgo : false,
        };
    });

    return NextResponse.json({
        items,
        earnedCount: earned.length,
        totalCount: ACHIEVEMENTS.length,
    });
}
