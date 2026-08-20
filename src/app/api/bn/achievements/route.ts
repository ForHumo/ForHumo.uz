// BN yutuqlar API — foydalanuvchining BN yutuqlari + progress.
// Auth talab qilinadi. UI shu endpoint'dan o'qib grid'ni chizadi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { ACHIEVEMENTS } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    // BN yutuqlari katalog + foydalanuvchining olganlari
    const bnCatalog = ACHIEVEMENTS.filter(a => a.category === "bn");

    const [earned, referralRewarded] = await Promise.all([
        prisma.userAchievement.findMany({
            where: { profileId: auth.profileId, category: "bn" },
            select: { code: true, earnedAt: true },
        }).catch(() => []),
        prisma.bnReferral.count({
            where: { inviterId: auth.profileId, status: "REWARDED" },
        }).catch(() => 0),
    ]);

    const earnedByCode = new Map(earned.map(e => [e.code, e.earnedAt.toISOString()]));

    const items = bnCatalog.map(a => ({
        code: a.code,
        title: a.title,
        description: a.description,
        icon: a.icon,
        tier: a.tier,
        earnedAt: earnedByCode.get(a.code) ?? null,
        // Ba'zi yutuqlarga progress qo'shamiz (X/N)
        progress: a.code === "bn.referral_10"
            ? { current: Math.min(referralRewarded, 10), target: 10 }
            : null,
    }));

    return NextResponse.json({
        items,
        earnedCount: earned.length,
        totalCount: bnCatalog.length,
    });
}
