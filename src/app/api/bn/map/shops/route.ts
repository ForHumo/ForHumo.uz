// BN Xarita — Leaflet do'konlar joylashuvi.
// Toshkent bo'ylab APPROVED, lat/lng bor barcha do'konlar.
// Bozorlar (BnMarket) alohida qatlam sifatida qaytariladi (kattaroq marker).
//
// GET → { shops: [...], markets: [...] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 900; // 15 daq cache

export async function GET() {
    const [shops, markets] = await Promise.all([
        prisma.bnShop.findMany({
            where: {
                status: "APPROVED",
                lat: { not: null },
                lng: { not: null },
            },
            select: {
                slug: true, name: true, city: true, address: true,
                lat: true, lng: true,
                tier: true, verifiedTier: true, rating: true, ratingCount: true,
                productCount: true, orderCount: true,
                logoUrl: true,
                marketId: true,
                premiumTier: true, premiumUntil: true,
                market: { select: { slug: true, name: true } },
            },
            take: 2000,
        }),
        prisma.bnMarket.findMany({
            where: {
                lat: { not: null },
                lng: { not: null },
            },
            select: {
                slug: true, name: true, nameRu: true, city: true, address: true,
                lat: true, lng: true, district: true, coverUrl: true,
            },
            take: 100,
        }),
    ]);

    const now = new Date();
    const shopsOut = shops.map(s => ({
        slug: s.slug,
        name: s.name,
        city: s.city,
        address: s.address,
        lat: s.lat!,
        lng: s.lng!,
        tier: s.tier,
        verifiedTier: s.verifiedTier,
        rating: s.rating,
        ratingCount: s.ratingCount,
        productCount: s.productCount,
        orderCount: s.orderCount,
        logoUrl: s.logoUrl,
        isPremium: !!(s.premiumUntil && s.premiumUntil > now),
        market: s.market,
    }));

    const marketsOut = markets.map(m => ({
        slug: m.slug,
        name: m.name,
        nameRu: m.nameRu,
        city: m.city,
        address: m.address,
        district: m.district,
        lat: m.lat!,
        lng: m.lng!,
        coverUrl: m.coverUrl,
    }));

    return NextResponse.json({ shops: shopsOut, markets: marketsOut });
}
