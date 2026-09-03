// Nexus admin — reklamalar moderatsiyasi.
// GET /api/nexus/admin/ads?status=active|hidden|expired
// Faqat founder (Humo ID whitelist) yoki BN OWNER admin ko'ra oladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FOUNDER_HUMO_IDS } from "@/lib/founders";

export const dynamic = "force-dynamic";

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, humoId: true },
    });
    if (!me) return null;
    const isFounder = !!(me.humoId && FOUNDER_HUMO_IDS.includes(me.humoId));
    if (isFounder) return me;
    const bnAdmin = await prisma.bnAdmin.findUnique({
        where: { profileId: me.id },
        select: { role: true },
    });
    if (bnAdmin && (bnAdmin.role === "OWNER" || bnAdmin.role === "MODERATOR")) return me;
    return null;
}

export async function GET(req: Request) {
    const me = await requireAdmin();
    if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const filter = url.searchParams.get("status") ?? "active";
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (filter === "hidden") where.hidden = true;
    else if (filter === "expired") where.expiresAt = { lt: now };
    else {
        where.hidden = false;
        where.expiresAt = { gt: now };
        where.active = true;
    }

    const ads = await prisma.nexusAdSlot.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return NextResponse.json({
        ads: ads.map(a => ({
            id: a.id,
            slot: a.slot,
            imageUrl: a.imageUrl,
            title: a.title,
            body: a.body,
            ctaUrl: a.ctaUrl,
            ctaText: a.ctaText,
            ownerUsername: a.ownerUsername,
            ownerAvatar: a.ownerAvatar,
            startsAt: a.startsAt.toISOString(),
            expiresAt: a.expiresAt.toISOString(),
            active: a.active,
            hidden: a.hidden,
            moderationNote: a.moderationNote,
            daysCount: a.daysCount,
            paidAmountUzs: a.paidAmountUzs,
            impressions: a.impressions,
            clicks: a.clicks,
            ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
            createdAt: a.createdAt.toISOString(),
        })),
    });
}
