// BN trending mahsulotlar — so'nggi 7 kunda ko'p ko'rilgan/sotib olingan.
// Ochiq endpoint (login shart emas), 10 daq cache.
// Reyting formula: views * 1 + orders * 5 (buyurtma engagement 5x kuchli signal).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 600;

const RANGE_DAYS: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };

interface TrendingItem {
    slug: string;
    title: string;
    image: string | null;
    price: number;
    marketAvgPrice: number | null;
    shopName: string;
    marketName: string | null;
    city: string;
    viewsRecent: number;
    ordersRecent: number;
    score: number;
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const rangeParam = url.searchParams.get("range") ?? "7d";
    const days = RANGE_DAYS[rangeParam] ?? 7;
    const weekAgo = new Date(Date.now() - days * 86400_000);

    // 7 kunda VIEW event bergan productId'lar — top 50 view'li mahsulot
    const viewsGrouped = await prisma.bnUserEvent.groupBy({
        by: ["productId"],
        where: { type: "VIEW", createdAt: { gte: weekAgo } },
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 50,
    }).catch(() => []);

    // Order-item count per product (parallel)
    const productIds = viewsGrouped.map(v => v.productId);
    if (productIds.length === 0) {
        return NextResponse.json({ items: [] });
    }

    const [ordersGrouped, products] = await Promise.all([
        prisma.bnOrderItem.groupBy({
            by: ["productId"],
            where: {
                productId: { in: productIds },
                order: {
                    status: { in: ["CONFIRMED", "READY", "COMPLETED"] },
                    placedAt: { gte: weekAgo },
                },
            },
            _count: { _all: true },
        }),
        prisma.bnProduct.findMany({
            where: {
                id: { in: productIds },
                isActive: true, hidden: false,
                isWholesale: false, isMature: false,
            },
            select: {
                slug: true, title: true, images: true, price: true, marketAvgPrice: true,
                shop: { select: { name: true, city: true, market: { select: { name: true } } } },
                id: true,
            },
        }),
    ]);

    const viewsById = new Map(viewsGrouped.map(v => [v.productId, v._count._all]));
    const ordersById = new Map(ordersGrouped.map(o => [o.productId, o._count._all]));

    const items: TrendingItem[] = products
        .filter(p => p.images.length > 0)
        .map(p => {
            const viewsRecent = viewsById.get(p.id) ?? 0;
            const ordersRecent = ordersById.get(p.id) ?? 0;
            const score = viewsRecent + ordersRecent * 5;
            return {
                slug: p.slug,
                title: p.title,
                image: p.images[0] ?? null,
                price: p.price,
                marketAvgPrice: p.marketAvgPrice,
                shopName: p.shop?.name ?? "",
                marketName: p.shop?.market?.name ?? null,
                city: p.shop?.city ?? "Toshkent",
                viewsRecent,
                ordersRecent,
                score,
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    return NextResponse.json({ items });
}
