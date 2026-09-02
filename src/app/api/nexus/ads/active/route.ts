// Nexus aktiv reklama slotlar (3 slot). Feed'ga aylanma tarzda kiritish uchun.
// GET /api/nexus/ads/active → { ads: [ {slot, ...} ] } — bo'sh slot yashiriladi (feed uchun)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export interface NxAdPublic {
    id: string;
    slot: number;
    imageUrl: string;
    title: string;
    body: string | null;
    ctaUrl: string;
    ctaText: string;
    ownerUsername: string | null;
    ownerAvatar: string | null;
}

export async function GET() {
    const now = new Date();
    const ads = await prisma.nexusAdSlot.findMany({
        where: {
            active: true, hidden: false,
            startsAt: { lte: now }, expiresAt: { gt: now },
        },
        orderBy: [{ slot: "asc" }, { createdAt: "desc" }],
        select: {
            id: true, slot: true, imageUrl: true, title: true, body: true,
            ctaUrl: true, ctaText: true,
            ownerUsername: true, ownerAvatar: true,
        },
    });

    // Har slot uchun bitta (agar dublikat bo'lsa eng oxirgi)
    const bySlot = new Map<number, NxAdPublic>();
    for (const a of ads) if (!bySlot.has(a.slot)) bySlot.set(a.slot, a);

    return NextResponse.json({ ads: Array.from(bySlot.values()) });
}
