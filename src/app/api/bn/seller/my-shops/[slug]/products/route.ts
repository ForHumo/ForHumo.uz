// Sotuvchining tanlangan do'konidagi aktiv mahsulotlari — reklama havolasi
// uchun product tanlashga ishlatiladi.
//
//   GET /api/bn/seller/my-shops/[slug]/products → { products: [{ slug, title }] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const { slug } = await ctx.params;
    const shop = await prisma.bnShop.findFirst({
        where: { slug, profileId: auth.profileId },
        select: { id: true },
    });
    if (!shop) return NextResponse.json({ products: [] });

    const products = await prisma.bnProduct.findMany({
        where: { shopId: shop.id, isActive: true, hidden: false },
        select: { slug: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return NextResponse.json({ products });
}
