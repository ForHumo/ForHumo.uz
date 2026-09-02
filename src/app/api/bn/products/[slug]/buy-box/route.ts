// BN Buy Box — bir xil mahsulot uchun eng arzon + ishonchli sotuvchi.
// Bir xil `title` (yoki category+attributes hash) uchun barcha faol
// sotuvchilardan eng yaxshi Buy Box tanlanadi:
//   score = -price + 1000*rating + 500*(verifiedTier=WHOLESALE?2:1) + 200*isPremium
// Eng yuqori score g'olib. Amazon uslub.
//
// GET /api/bn/products/[slug]/buy-box → { winner: { productSlug, shopName, ... }, alternatives: [...] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 daq

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const anchor = await prisma.bnProduct.findUnique({
        where: { slug },
        select: {
            id: true, title: true, categoryId: true,
            shop: { select: { id: true } },
        },
    });
    if (!anchor) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Bir xil title yoki category+shu title so'zlar bo'yicha alternativalar
    // (aslida bo'lg'usi versiyada slug hash yoki productKey ishlatilishi kerak)
    const candidates = await prisma.bnProduct.findMany({
        where: {
            isActive: true,
            hidden: false,
            stock: { gt: 0 },
            OR: [
                { title: anchor.title },
                { title: { contains: anchor.title.split(" ")[0], mode: "insensitive" } },
            ],
            ...(anchor.categoryId ? { categoryId: anchor.categoryId } : {}),
        },
        select: {
            id: true, slug: true, title: true, price: true, rating: true, ratingCount: true,
            images: true, marketAvgPrice: true,
            shop: {
                select: {
                    id: true, name: true, slug: true, tier: true, verifiedTier: true,
                    rating: true, ratingCount: true, premiumTier: true, premiumUntil: true,
                    orderCount: true,
                },
            },
        },
        take: 20,
    });

    if (candidates.length === 0) return NextResponse.json({ winner: null, alternatives: [] });

    const now = new Date();
    const scored = candidates.map(p => {
        const isPremium = p.shop.premiumUntil && p.shop.premiumUntil > now;
        const verifyBonus = p.shop.verifiedTier === "WHOLESALE" ? 2 : p.shop.verifiedTier === "RETAIL" ? 1 : 0;
        // Score: past narx yaxshi (negative), yuqori rating yaxshi, verified yaxshi, premium yaxshi
        const score =
            -p.price / 1000                          // narx (kichikroq = yaxshi)
            + (p.rating || p.shop.rating || 0) * 2000  // reyting
            + verifyBonus * 500                       // verified
            + (isPremium ? 200 : 0)                   // premium
            + Math.log(1 + p.shop.orderCount) * 100;  // tajriba
        return { ...p, isPremium: !!isPremium, score };
    }).sort((a, b) => b.score - a.score);

    const winner = scored[0];
    const alternatives = scored.slice(1, 6);

    const format = (p: typeof scored[0]) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        price: p.price,
        image: p.images[0] || null,
        rating: p.rating,
        ratingCount: p.ratingCount,
        marketAvgPrice: p.marketAvgPrice,
        shop: {
            id: p.shop.id,
            name: p.shop.name,
            slug: p.shop.slug,
            tier: p.shop.tier,
            verifiedTier: p.shop.verifiedTier,
            isPremium: p.isPremium,
            rating: p.shop.rating,
        },
    });

    return NextResponse.json({
        winner: format(winner),
        alternatives: alternatives.map(format),
        isAnchorWinner: winner.slug === slug,
    });
}
