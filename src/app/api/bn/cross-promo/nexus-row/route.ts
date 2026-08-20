// Nexus home rows uchun BN cross-promo endpoint.
// Bozor narxidan arzon 10 ta mahsulot — Nexus home'da qator sifatida chiqadi.
// Ochiq (login shart emas), 10 daqiqa keshlanadi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 600;

interface RowItem {
    slug: string;
    title: string;
    image: string | null;
    price: number;
    marketAvg: number;
    savedPct: number;
    shopName: string;
}

export async function GET() {
    // Faqat bozor narxidan arzon va rasm bor bo'lgan mahsulotlar
    const rows = await prisma.bnProduct.findMany({
        where: {
            isActive: true, hidden: false,
            isWholesale: false, isMature: false,
            marketAvgPrice: { not: null },
            NOT: { images: { equals: [] } },
        },
        select: {
            slug: true, title: true, images: true, price: true, marketAvgPrice: true,
            shop: { select: { name: true } },
        },
        take: 60,
        orderBy: { updatedAt: "desc" },
    }).catch(() => []);

    const items: RowItem[] = rows
        .filter(p => p.marketAvgPrice && p.price < p.marketAvgPrice && p.images.length > 0)
        .map(p => ({
            slug: p.slug,
            title: p.title,
            image: p.images[0] ?? null,
            price: p.price,
            marketAvg: p.marketAvgPrice as number,
            savedPct: Math.round(((p.marketAvgPrice as number - p.price) / (p.marketAvgPrice as number)) * 100),
            shopName: p.shop?.name ?? "",
        }))
        .sort((a, b) => b.savedPct - a.savedPct)   // eng ko'p tejalganlarni tepaga
        .slice(0, 10);

    return NextResponse.json({ items });
}
