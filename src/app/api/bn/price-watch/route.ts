// BN narx tushdi kuzatish — foydalanuvchi mahsulotni "kuzatish"ga qo'yadi,
// kunlik cron narx N% pastga tushsa Nexus notification yuboradi.
//
//   GET  /api/bn/price-watch                       — men kuzatayotganlar
//   POST /api/bn/price-watch    { productId, targetPct? }   toggle (bor bo'lsa o'chadi)
//   GET  /api/bn/price-watch?productId=xxx         — bitta mahsulot statusi

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth, getBnAuth } from "@/lib/bn-auth";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (productId) {
        const auth = await getBnAuth();
        if (!auth) return NextResponse.json({ watched: false });
        const w = await prisma.bnPriceWatch.findUnique({
            where: { profileId_productId: { profileId: auth.profileId, productId } },
            select: { id: true, targetPct: true, basePrice: true },
        });
        return NextResponse.json({ watched: !!w, watch: w });
    }

    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const list = await prisma.bnPriceWatch.findMany({
        where: { profileId: auth.profileId },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    return NextResponse.json({ items: list });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "");
    const targetPct = Math.max(3, Math.min(80, Number(body?.targetPct) || 10));
    if (!productId) return NextResponse.json({ error: "productId_required" }, { status: 400 });

    const existing = await prisma.bnPriceWatch.findUnique({
        where: { profileId_productId: { profileId: auth.profileId, productId } },
    });

    if (existing) {
        await prisma.bnPriceWatch.delete({ where: { id: existing.id } });
        return NextResponse.json({ ok: true, watched: false });
    }

    const product = await prisma.bnProduct.findUnique({
        where: { id: productId },
        select: { price: true, isActive: true },
    });
    if (!product || !product.isActive) return NextResponse.json({ error: "product_unavailable" }, { status: 404 });

    const w = await prisma.bnPriceWatch.create({
        data: {
            profileId: auth.profileId, productId, targetPct,
            basePrice: product.price,
        },
    });
    return NextResponse.json({ ok: true, watched: true, watch: w });
}
