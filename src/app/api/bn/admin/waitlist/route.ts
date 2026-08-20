// BN admin — sotuvchi WAITLIST ro'yxati (status filtri bilan).
// Faqat OWNER yoki MODERATOR admin.
//
// GET /api/bn/admin/waitlist?status=PENDING&limit=100

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import type { BnSellerWaitlistStatus } from "@prisma/client";

async function requireBnAdmin(profileId: string): Promise<boolean> {
    const a = await prisma.bnAdmin.findUnique({
        where: { profileId }, select: { role: true },
    });
    return a?.role === "OWNER" || a?.role === "MODERATOR";
}

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    if (!(await requireBnAdmin(auth.profileId))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as BnSellerWaitlistStatus | null;
    const limit = Math.min(500, Number(searchParams.get("limit")) || 100);

    const entries = await prisma.bnSellerWaitlist.findMany({
        where: status ? { status } : {},
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    // Bozor nomlarini bir marta yuklab olamiz (marketSlug'dan)
    const marketSlugs = [...new Set(entries.map(e => e.marketSlug).filter(Boolean) as string[])];
    const markets = marketSlugs.length ? await prisma.bnMarket.findMany({
        where: { slug: { in: marketSlugs } },
        select: { slug: true, name: true },
    }) : [];
    const marketByName = new Map(markets.map(m => [m.slug, m.name]));

    // Kontakt qilingan admin ismi
    const contactedIds = [...new Set(entries.map(e => e.contactedById).filter(Boolean) as string[])];
    const contactedProfiles = contactedIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: contactedIds } },
        select: { id: true, name: true, username: true },
    }) : [];
    const profById = new Map(contactedProfiles.map(p => [p.id, p]));

    const enriched = entries.map(e => ({
        ...e,
        marketName: e.marketSlug ? marketByName.get(e.marketSlug) ?? null : null,
        contactedBy: e.contactedById ? profById.get(e.contactedById) ?? null : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        contactedAt: e.contactedAt?.toISOString() ?? null,
    }));

    // Umumiy statistika (chip badge'lar uchun)
    const counts = await prisma.bnSellerWaitlist.groupBy({
        by: ["status"],
        _count: { _all: true },
    });
    const stats: Record<string, number> = {};
    for (const c of counts) stats[c.status] = c._count._all;

    return NextResponse.json({ entries: enriched, stats });
}
