// BN home — trending kategoriyalar qatori (M2).
// So'nggi 7 kunlik VIEW event'lariga qarab top-8 kategoriya.
// Fallback: eng ko'p mahsulotli kategoriyalar.
//
// GET /api/bn/home/trending-categories

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 600; // 10 daq keshlash

interface Row {
    slug: string;
    name: string;
    productCount: number;
    imageUrl: string | null;
}

export async function GET() {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    // 1) So'nggi 7 kun VIEW event'lari — mahsulot bo'yicha
    const events = await prisma.bnUserEvent.groupBy({
        by: ["productId"],
        where: { type: "VIEW", createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 500,
    });
    const productIds = events.map(e => e.productId);
    const eventCountMap = new Map(events.map(e => [e.productId, e._count._all]));

    // 2) Product → categoryId
    const products = productIds.length ? await prisma.bnProduct.findMany({
        where: { id: { in: productIds }, isActive: true, hidden: false },
        select: { id: true, categoryId: true, images: true },
    }) : [];

    // 3) Category bo'yicha yig'ish (event-weighted)
    const catScore = new Map<string, number>();
    const catCover = new Map<string, string>();
    for (const p of products) {
        if (!p.categoryId) continue;
        const w = eventCountMap.get(p.id) ?? 0;
        catScore.set(p.categoryId, (catScore.get(p.categoryId) ?? 0) + w);
        if (!catCover.has(p.categoryId) && p.images[0]) {
            catCover.set(p.categoryId, p.images[0]);
        }
    }

    let rows: Row[] = [];
    if (catScore.size >= 4) {
        // Faol kategoriyalar bor — asosiy yo'l
        const topIds = [...catScore.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([id]) => id);
        const cats = await prisma.bnCategory.findMany({
            where: { id: { in: topIds }, isActive: true },
            select: { id: true, slug: true, name: true, _count: { select: { products: true } } },
        });
        const scoreOrder = new Map(topIds.map((id, i) => [id, i]));
        rows = cats
            .map(c => ({
                _order: scoreOrder.get(c.id) ?? 999,
                slug: c.slug,
                name: c.name,
                productCount: c._count.products,
                imageUrl: catCover.get(c.id) ?? null,
            }))
            .sort((a, b) => a._order - b._order)
            .map(({ _order, ...r }) => { void _order; return r; });
    } else {
        // Fallback: mahsulot soni bo'yicha
        const cats = await prisma.bnCategory.findMany({
            where: { isActive: true, parentId: null },
            orderBy: [{ order: "asc" }, { name: "asc" }],
            take: 8,
            select: {
                id: true, slug: true, name: true,
                _count: { select: { products: true } },
                products: { take: 1, where: { isActive: true, hidden: false }, select: { images: true } },
            },
        });
        rows = cats.map(c => ({
            slug: c.slug,
            name: c.name,
            productCount: c._count.products,
            imageUrl: c.products[0]?.images[0] ?? null,
        }));
    }

    // Bo'sh mahsulotli kategoriyalarni chiqarib tashlaymiz
    rows = rows.filter(r => r.productCount > 0);

    return NextResponse.json({ categories: rows });
}
