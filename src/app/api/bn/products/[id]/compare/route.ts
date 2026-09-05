// Mahsulotni boshqa do'konlarda solishtirish.
// Bir kategoriya ichidan o'xshash nomdagi mahsulotlarni topib qaytaradi
// va narx tejalishini hisoblab beradi.
//
//   GET /api/bn/products/[id]/compare
//
// Faqat aktiv+ochiq mahsulotlar, boshqa do'konlar (o'zi bilan solishtirmaydi).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 daq cache

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const product = await prisma.bnProduct.findUnique({
        where: { id },
        select: {
            id: true, title: true, price: true, shopId: true, categoryId: true,
            category: { select: { slug: true, name: true } },
        },
    });
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // O'xshash mahsulotlarni topish: bir kategoriya + nom qismi mos keladi
    const titleWords = product.title
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3)
        .slice(0, 3);

    const similarProducts = await prisma.bnProduct.findMany({
        where: {
            isActive: true,
            hidden: false,
            shopId: { not: product.shopId },   // boshqa do'kon
            categoryId: product.categoryId,
            AND: titleWords.length > 0
                ? [{ OR: titleWords.map(w => ({ title: { contains: w, mode: "insensitive" as const } })) }]
                : undefined,
        },
        select: {
            id: true, slug: true, title: true, price: true, oldPrice: true,
            images: true, stock: true, rating: true, ratingCount: true,
            shop: { select: { id: true, slug: true, name: true, tier: true, city: true, marketId: true } },
        },
        orderBy: { price: "asc" },
        take: 8,
    });

    const cheapest = similarProducts[0]?.price ?? null;
    const savings = cheapest !== null && cheapest < product.price ? product.price - cheapest : 0;
    const savingsPct = savings > 0 ? Math.round((savings / product.price) * 100) : 0;

    return NextResponse.json({
        product: {
            id: product.id,
            title: product.title,
            price: product.price,
            category: product.category,
        },
        alternatives: similarProducts.map(p => ({
            productId: p.id,
            slug: p.slug,
            title: p.title,
            price: p.price,
            oldPrice: p.oldPrice,
            imageUrl: p.images[0] || null,
            stock: p.stock,
            rating: p.rating,
            ratingCount: p.ratingCount,
            shop: p.shop,
            diff: p.price - product.price,
            diffPct: Math.round(((p.price - product.price) / product.price) * 100),
            cheaper: p.price < product.price,
        })),
        summary: {
            cheapest,
            currentPrice: product.price,
            possibleSavings: savings,
            savingsPct,
            alternativeCount: similarProducts.length,
        },
    });
}
