// Bitta mahsulot uchun 30/60/90 kunlik batafsil analitika.
//
//   GET /api/bn/seller/products/[id]/analytics?days=30
//
// Qaytaradi: kunlik sotuv/tushum, umumiy ko'rishlar, konversiya, oxirgi buyurtmalar.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const product = await prisma.bnProduct.findUnique({
        where: { id },
        include: { shop: { select: { profileId: true } } },
    });
    if (!product || product.shop?.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(searchParams.get("days")) || 30));
    const now = new Date();
    const from = new Date(now.getTime() - days * 86400000);

    const [items, views, recentOrders] = await Promise.all([
        prisma.bnOrderItem.findMany({
            where: {
                productId: id,
                order: { status: "COMPLETED", completedAt: { gte: from } },
            },
            include: {
                order: { select: { id: true, code: true, buyerId: true, completedAt: true, placedAt: true } },
            },
        }),
        prisma.bnUserEvent.count({
            where: { productId: id, type: "VIEW", createdAt: { gte: from } },
        }),
        prisma.bnOrderItem.findMany({
            where: { productId: id },
            include: {
                order: { select: { code: true, buyerId: true, status: true, placedAt: true } },
            },
            orderBy: { order: { placedAt: "desc" } },
            take: 10,
        }),
    ]);

    // Kunlik trend
    const trend: { day: string; qty: number; revenue: number }[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(from.getTime() + i * 86400000);
        trend.push({ day: d.toISOString().slice(0, 10), qty: 0, revenue: 0 });
    }
    const idx = new Map(trend.map((t, i) => [t.day, i]));
    for (const it of items) {
        const key = (it.order.completedAt || it.order.placedAt).toISOString().slice(0, 10);
        const i = idx.get(key);
        if (i !== undefined) {
            trend[i].qty += it.qty;
            trend[i].revenue += it.price * it.qty;
        }
    }

    const totalQty = items.reduce((s, it) => s + it.qty, 0);
    const totalRev = items.reduce((s, it) => s + it.price * it.qty, 0);
    const uniqueBuyers = new Set(items.map(it => it.order.buyerId)).size;
    const conversionPct = views > 0 ? +((totalQty / views) * 100).toFixed(1) : 0;

    return NextResponse.json({
        product: {
            id: product.id,
            title: product.title,
            price: product.price,
            oldPrice: product.oldPrice,
            stock: product.stock,
            sold: product.sold,
            images: product.images.slice(0, 4),
            createdAt: product.createdAt.toISOString(),
        },
        period: { days, from: from.toISOString(), to: now.toISOString() },
        summary: { totalQty, totalRev, uniqueBuyers, totalViews: views, conversionPct },
        trend,
        recentOrders: recentOrders.map(r => ({
            code: r.order.code,
            status: r.order.status,
            qty: r.qty,
            revenue: r.price * r.qty,
            placedAt: r.order.placedAt.toISOString(),
        })),
    });
}
