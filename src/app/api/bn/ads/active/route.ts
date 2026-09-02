// BN aktiv reklama bannerlar — bosh sahifadagi slider uchun.
// GET /api/bn/ads/active → { banners: [ {slot, imageUrl, title, ctaUrl}, ... ] }
// Slot 1..5 tartibida, bo'sh slot'lar `null` sifatida qaytariladi (5 element garantiya).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60; // 1 daq cache

export interface AdBannerPublic {
    id: string;
    slot: number;
    imageUrl: string;
    title: string;
    ctaUrl: string;
    shopSlug: string | null;
}

export async function GET() {
    const now = new Date();
    const banners = await prisma.bnAdBanner.findMany({
        where: {
            active: true,
            hidden: false,
            startsAt: { lte: now },
            expiresAt: { gt: now },
        },
        select: {
            id: true, slot: true, imageUrl: true, title: true, ctaUrl: true, shopSlug: true,
        },
        orderBy: [{ slot: "asc" }, { createdAt: "desc" }],
    });

    // Har slot uchun eng oxirgi aktiv (agar duplikat bo'lsa)
    const bySlot = new Map<number, AdBannerPublic>();
    for (const b of banners) {
        if (!bySlot.has(b.slot)) bySlot.set(b.slot, b);
    }

    const result: (AdBannerPublic | null)[] = [];
    for (let s = 1; s <= 5; s++) {
        result.push(bySlot.get(s) ?? null);
    }
    return NextResponse.json({ banners: result });
}
