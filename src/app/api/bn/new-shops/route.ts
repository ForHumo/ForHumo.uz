// BN "Yangi ochilgan do'konlar" — supply-side social proof.
// Oxirgi 7 kunda APPROVED bo'lgan do'konlar soni (approvedAt bo'yicha).
// Ochiq endpoint, 15 daqiqa cache.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export async function GET() {
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const [count, latest] = await Promise.all([
        prisma.bnShop.count({
            where: { status: "APPROVED", approvedAt: { gte: weekAgo } },
        }),
        prisma.bnShop.findMany({
            where: { status: "APPROVED", approvedAt: { gte: weekAgo } },
            select: {
                slug: true, name: true, logoUrl: true, city: true,
                market: { select: { name: true } },
            },
            orderBy: { approvedAt: "desc" },
            take: 5,
        }),
    ]);
    return NextResponse.json({
        count,
        preview: latest.map(s => ({
            slug: s.slug,
            name: s.name,
            logoUrl: s.logoUrl,
            location: s.market?.name ?? s.city,
        })),
    });
}
