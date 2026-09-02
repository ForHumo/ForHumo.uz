// BN mahsulot narx tarixi grafigi uchun endpoint.
// GET /api/bn/products/[slug]/price-history?days=30|90|365
//
// Bugungi narx BnProduct.price'dan olinadi (agar bugungi snapshot yo'q bo'lsa),
// qolgani BnPriceHistory'dan. Fallback: agar hech qanday tarix yo'q bo'lsa, bo'sh array.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 1800; // 30 daq

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const daysRaw = Math.floor(Number(searchParams.get("days") || "30"));
    const days = [30, 90, 365].includes(daysRaw) ? daysRaw : 30;

    const product = await prisma.bnProduct.findUnique({
        where: { slug },
        select: { id: true, price: true, marketAvgPrice: true },
    });
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const history = await prisma.bnPriceHistory.findMany({
        where: { productId: product.id, capturedAt: { gte: since } },
        orderBy: { capturedAt: "asc" },
        select: { price: true, marketAvg: true, capturedAt: true },
    });

    // Bugungi snapshot'ni doim ko'rsatish (agar cron bo'lmagan bo'lsa)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasToday = history.some(h => h.capturedAt >= today);
    const points = history.map(h => ({
        t: h.capturedAt.toISOString(),
        price: h.price,
        marketAvg: h.marketAvg,
    }));
    if (!hasToday) {
        points.push({ t: new Date().toISOString(), price: product.price, marketAvg: product.marketAvgPrice });
    }

    // Statistika
    const prices = points.map(p => p.price);
    const min = prices.length ? Math.min(...prices) : product.price;
    const max = prices.length ? Math.max(...prices) : product.price;
    const first = prices[0] ?? product.price;
    const last = prices[prices.length - 1] ?? product.price;
    const changePct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;

    return NextResponse.json({
        days,
        points,
        stats: {
            min, max, first, last, changePct,
            marketAvg: product.marketAvgPrice,
        },
    });
}
