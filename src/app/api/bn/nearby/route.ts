// BN "yaqin do'konlar" — foydalanuvchi joylashuvidan Haversine masofa bo'yicha
// eng yaqin APPROVED do'konlar. Ochiq endpoint (login shart emas).
// Aniq lat/lng URL'da uzatilishi xavfli emas — foydalanuvchi o'zi berdi
// va shu javob uchungina ishlatiladi (saqlanmaydi).
//
//   GET /api/bn/nearby?lat=41.31&lng=69.24&radius=5&limit=15
//   radius km (default 5, max 30); limit default 15, max 30.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;   // shaxsiy — cache kerak emas

const R_KM = 6371;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const radius = Math.min(30, Math.max(0.5, Number(url.searchParams.get("radius")) || 5));
    const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit")) || 15));

    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return NextResponse.json({ error: "invalid_coords" }, { status: 400 });
    }

    // Do'konlarning lat/lng bor bo'lganlarini olamiz + kerakli bozor ma'lumoti
    const shops = await prisma.bnShop.findMany({
        where: {
            status: "APPROVED",
            lat: { not: null },
            lng: { not: null },
        },
        select: {
            id: true, slug: true, name: true, logoUrl: true,
            tier: true, verifiedTier: true,
            lat: true, lng: true,
            city: true, address: true,
            rating: true, ratingCount: true, productCount: true,
            locationType: true, marketSection: true, marketShopNo: true,
            market: { select: { slug: true, name: true } },
        },
        take: 500,   // JS'da filtrlaymiz — Postgres PostGIS'siz Haversine query qiyin
    }).catch(() => []);

    const withDist = shops
        .map(s => ({
            ...s,
            distKm: haversineKm(lat, lng, s.lat as number, s.lng as number),
        }))
        .filter(s => s.distKm <= radius)
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, limit)
        .map(s => ({
            slug: s.slug,
            name: s.name,
            logoUrl: s.logoUrl,
            tier: s.tier,
            verifiedTier: s.verifiedTier,
            city: s.city,
            address: s.address,
            marketSlug: s.market?.slug ?? null,
            marketName: s.market?.name ?? null,
            marketSection: s.marketSection,
            marketShopNo: s.marketShopNo,
            locationType: s.locationType,
            rating: s.rating,
            ratingCount: s.ratingCount,
            productCount: s.productCount,
            lat: s.lat,
            lng: s.lng,
            distKm: Math.round(s.distKm * 10) / 10,   // 0.1km precision
        }));

    return NextResponse.json({
        shops: withDist,
        userLat: lat,
        userLng: lng,
        radius,
    });
}
