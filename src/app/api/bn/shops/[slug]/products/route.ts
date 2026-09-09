// Do'kon mahsulotlari (yengil ro'yxat — purchase modal uchun).
//   GET /api/bn/shops/[slug]/products?limit=30

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const { slug } = await ctx.params;
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "30")));

    const shop = await prisma.bnShop.findUnique({ where: { slug }, select: { id: true } });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const products = await prisma.bnProduct.findMany({
        where: { shopId: shop.id, isActive: true, hidden: false },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
            id: true, title: true, price: true, images: true,
        },
    });

    return NextResponse.json({
        products: products.map(p => ({
            id: p.id,
            title: p.title,
            price: p.price,
            image: p.images?.[0] ?? null,
        })),
    });
}
