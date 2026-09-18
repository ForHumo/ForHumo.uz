// GET /api/bn/deals — xaridorning faol narx kelishuvlari ("Kelishilgan narxlarim").
// Sotuvchi qabul qilgan narx 48 soat band — xaridor shu muddatda sotib olishi kerak.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const deals = await prisma.bnPriceDeal.findMany({
        where: { buyerId: auth.profileId, status: "ACTIVE", expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    if (deals.length === 0) return NextResponse.json({ deals: [] });

    const productIds = [...new Set(deals.map(d => d.productId))];
    const shopIds = [...new Set(deals.map(d => d.shopId))];
    const [products, shops] = await Promise.all([
        prisma.bnProduct.findMany({
            where: { id: { in: productIds } },
            select: { id: true, slug: true, title: true, price: true, images: true, stock: true, isActive: true, hidden: true },
        }),
        prisma.bnShop.findMany({
            where: { id: { in: shopIds } },
            select: { id: true, slug: true, name: true },
        }),
    ]);
    const pById = new Map(products.map(p => [p.id, p]));
    const sById = new Map(shops.map(s => [s.id, s]));

    const out = deals.map(d => {
        const p = pById.get(d.productId);
        const s = sById.get(d.shopId);
        if (!p || !s) return null;
        return {
            id: d.id,
            productSlug: p.slug,
            title: p.title,
            image: p.images?.[0] ?? null,
            listPrice: p.price,            // asl narx
            agreedPrice: d.agreedPrice,    // kelishilgan narx
            available: p.isActive && !p.hidden && p.stock > 0,
            shopSlug: s.slug,
            shopName: s.name,
            expiresAt: d.expiresAt,
        };
    }).filter(Boolean);

    return NextResponse.json({ deals: out });
}
