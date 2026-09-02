// BN home row — "Bugungi eng arzon" mahsulotlar.
// Bugungi narx bozor o'rtacha narxidan qanchalik past ekanini foizda ko'rsatadi.
// Yoki 7 kun oldin narxi hozirgidan pastroqmi solishtiradi (BnPriceHistory).
//
// GET /api/bn/cheapest-today  → top 10 mahsulot, %arzon foizi bilan.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 600; // 10 daq cache

interface Item {
    id: string;
    slug: string;
    title: string;
    price: number;
    oldPrice: number | null;
    image: string | null;
    shopName: string;
    shopSlug: string;
    marketAvgPrice: number | null;
    discountPct: number;                 // 0-100 arzonlik foizi
    reason: "market_avg" | "price_drop"; // qaysi manba
}

export async function GET() {
    // 1) Bozor o'rtacha narxdan arzon (priceRank='cheap' yoki marketAvgPrice > price)
    const cheapByMarket = await prisma.bnProduct.findMany({
        where: {
            isActive: true,
            hidden: false,
            stock: { gt: 0 },
            marketAvgPrice: { gt: 0 },
            priceRank: "cheap",
        },
        select: {
            id: true, slug: true, title: true, price: true, oldPrice: true,
            images: true, marketAvgPrice: true,
            shop: { select: { name: true, slug: true } },
        },
        take: 30,
    });

    const byMarket: Item[] = cheapByMarket
        .filter(p => p.marketAvgPrice && p.marketAvgPrice > p.price)
        .map(p => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            price: p.price,
            oldPrice: p.oldPrice,
            image: p.images[0] || null,
            shopName: p.shop.name,
            shopSlug: p.shop.slug,
            marketAvgPrice: p.marketAvgPrice,
            discountPct: Math.max(1, Math.round(((p.marketAvgPrice! - p.price) / p.marketAvgPrice!) * 100)),
            reason: "market_avg" as const,
        }))
        .sort((a, b) => b.discountPct - a.discountPct)
        .slice(0, 10);

    // Agar market_avg orqali 10 ta yig'ilmasa, price_drop bilan to'ldiramiz
    if (byMarket.length < 10) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        // Barcha mahsulotlarni olib, 7-kun oldingi narx bilan solishtiramiz
        const candidates = await prisma.bnProduct.findMany({
            where: {
                isActive: true, hidden: false, stock: { gt: 0 },
                id: { notIn: byMarket.map(x => x.id) },
            },
            select: {
                id: true, slug: true, title: true, price: true, oldPrice: true,
                images: true, marketAvgPrice: true,
                shop: { select: { name: true, slug: true } },
            },
            take: 100,
            orderBy: { updatedAt: "desc" },
        });
        const productIds = candidates.map(p => p.id);
        if (productIds.length > 0) {
            const history = await prisma.bnPriceHistory.findMany({
                where: { productId: { in: productIds }, capturedAt: { lte: weekAgo } },
                orderBy: { capturedAt: "desc" },
                distinct: ["productId"],
                select: { productId: true, price: true },
            });
            const oldPriceMap = new Map(history.map(h => [h.productId, h.price]));

            const drops: Item[] = [];
            for (const p of candidates) {
                const oldP = oldPriceMap.get(p.id);
                if (!oldP || oldP <= p.price) continue;
                const pct = Math.max(1, Math.round(((oldP - p.price) / oldP) * 100));
                if (pct < 5) continue; // 5%+ tushgan bo'lishi kerak
                drops.push({
                    id: p.id,
                    slug: p.slug,
                    title: p.title,
                    price: p.price,
                    oldPrice: oldP,
                    image: p.images[0] || null,
                    shopName: p.shop.name,
                    shopSlug: p.shop.slug,
                    marketAvgPrice: p.marketAvgPrice,
                    discountPct: pct,
                    reason: "price_drop",
                });
            }
            drops.sort((a, b) => b.discountPct - a.discountPct);
            byMarket.push(...drops.slice(0, 10 - byMarket.length));

            byMarket.push(...drops);
        }
    }

    return NextResponse.json({ items: byMarket });
}
