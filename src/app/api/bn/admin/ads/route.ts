// BN admin — reklamalar moderatsiyasi (K7).
//
// GET  /api/bn/admin/ads?status=active|hidden|expired   — ro'yxat
// POST /api/bn/admin/ads/[id]/hide    — banner yashirish (moderationNote bilan)
// POST /api/bn/admin/ads/[id]/unhide  — qayta ochish

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

async function requireAdmin(profileId: string) {
    const admin = await prisma.bnAdmin.findUnique({
        where: { profileId },
        select: { role: true },
    });
    if (!admin || (admin.role !== "OWNER" && admin.role !== "MODERATOR")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
}

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const guard = await requireAdmin(auth.profileId);
    if (guard) return guard;

    const url = new URL(req.url);
    const filter = url.searchParams.get("status") ?? "active";
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (filter === "hidden") where.hidden = true;
    else if (filter === "expired") where.expiresAt = { lt: now };
    else {
        // aktiv: hidden emas, expiresAt > now, active=true
        where.hidden = false;
        where.expiresAt = { gt: now };
        where.active = true;
    }

    const banners = await prisma.bnAdBanner.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    // Ownerlarning nomi (audit)
    const ownerIds = [...new Set(banners.map(b => b.ownerId))];
    const owners = ownerIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, username: true, humoId: true, email: true },
    }) : [];
    const ownerMap = new Map(owners.map(o => [o.id, o]));

    return NextResponse.json({
        banners: banners.map(b => ({
            id: b.id,
            slot: b.slot,
            imageUrl: b.imageUrl,
            title: b.title,
            ctaUrl: b.ctaUrl,
            shopSlug: b.shopSlug,
            startsAt: b.startsAt.toISOString(),
            expiresAt: b.expiresAt.toISOString(),
            active: b.active,
            hidden: b.hidden,
            moderationNote: b.moderationNote,
            daysCount: b.daysCount,
            paidAmountUzs: b.paidAmountUzs,
            impressions: b.impressions,
            clicks: b.clicks,
            ctr: b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0,
            createdAt: b.createdAt.toISOString(),
            owner: ownerMap.get(b.ownerId)
                ? {
                    username: ownerMap.get(b.ownerId)!.username,
                    humoId: ownerMap.get(b.ownerId)!.humoId,
                    email: ownerMap.get(b.ownerId)!.email,
                }
                : null,
        })),
    });
}
