// Sotuvchilar Nexus stories (24 soat) — BN bosh sahifasida "Do'konlar bugun" bo'limi.
//
// GET /api/bn/nexus-stories?limit=15

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(30, Number(searchParams.get("limit")) || 15);

    const shops = await prisma.bnShop.findMany({
        where: { status: "APPROVED" },
        select: { profileId: true, slug: true, name: true, logoUrl: true },
    });
    if (shops.length === 0) return NextResponse.json({ items: [] });
    const profileIds = shops.map(s => s.profileId);
    const shopByProfile = new Map(shops.map(s => [s.profileId, s]));

    const now = new Date();
    const stories = await prisma.nexusStory.findMany({
        where: {
            profileId: { in: profileIds },
            expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    // Do'kon bo'yicha guruhlash (bir do'konning bir necha story bo'lsa faqat oxirgi)
    const seen = new Set<string>();
    const items = [];
    for (const s of stories) {
        if (seen.has(s.profileId)) continue;
        seen.add(s.profileId);
        const shop = shopByProfile.get(s.profileId);
        if (!shop) continue;
        items.push({
            storyId: s.id,
            shopSlug: shop.slug,
            shopName: shop.name,
            avatarUrl: shop.logoUrl,
            coverUrl: s.mediaUrl,
            mediaType: s.mediaType,
            createdAt: s.createdAt.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
        });
    }

    return NextResponse.json({ items });
}
