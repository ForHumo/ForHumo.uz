// Bir bosishda mahsulotga chegirma qo'yish.
// oldPrice = joriy narx, price = joriy narx * (1 - pct/100).
// Chegirmani olib tashlash: pct=0 yoki removePriceCut=true.
//
//   POST /api/bn/seller/products/[id]/discount  { pct: 5..70 } | { remove: true }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

const MIN_PCT = 3;
const MAX_PCT = 70;

export async function POST(
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

    const body = await req.json().catch(() => ({}));
    if (body?.remove) {
        // Chegirmani olib tashlash: agar oldPrice bo'lsa, uni joriy price'ga tiklaymiz
        if (!product.oldPrice || product.oldPrice <= product.price) {
            return NextResponse.json({ ok: true, unchanged: true });
        }
        await prisma.bnProduct.update({
            where: { id }, data: { price: product.oldPrice, oldPrice: null },
        });
        return NextResponse.json({ ok: true, price: product.oldPrice, oldPrice: null, action: "removed" });
    }

    const pct = Math.floor(Number(body?.pct));
    if (!pct || pct < MIN_PCT || pct > MAX_PCT) {
        return NextResponse.json({
            error: "invalid_pct",
            message: `Chegirma ${MIN_PCT}% dan ${MAX_PCT}% gacha bo'lishi kerak.`,
        }, { status: 400 });
    }

    const currentEffective = product.price;
    const original = product.oldPrice && product.oldPrice > product.price ? product.oldPrice : product.price;
    const newPrice = Math.round(original * (1 - pct / 100) / 100) * 100; // 100 so'mgacha yaxlit
    if (newPrice >= currentEffective && product.oldPrice) {
        return NextResponse.json({
            error: "no_effect",
            message: "Bu chegirma joriy narxdan yuqori bo'ladi.",
        }, { status: 400 });
    }
    if (newPrice < 100) {
        return NextResponse.json({
            error: "too_low",
            message: "Yakuniy narx juda past. Chegirmani kamaytiring.",
        }, { status: 400 });
    }

    await prisma.bnProduct.update({
        where: { id },
        data: { price: newPrice, oldPrice: original },
    });
    return NextResponse.json({
        ok: true,
        price: newPrice,
        oldPrice: original,
        pct,
        savedPerUnit: original - newPrice,
    });
}
