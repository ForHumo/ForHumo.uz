// Bir vaqtda ko'p mahsulotga chegirma qo'yish.
//
//   POST /api/bn/seller/products/bulk-discount
//     { productIds: string[], pct: 3..70 }              — chegirma qo'yish
//     { productIds: string[], remove: true }             — chegirmani olib tashlash
//
// Faqat sotuvchining o'z do'kon mahsulotlari. Max 100 mahsulot bir zaharlanishda.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

const MIN_PCT = 3;
const MAX_PCT = 70;
const MAX_ITEMS = 100;

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.productIds) ? body.productIds.filter((x: unknown) => typeof x === "string").slice(0, MAX_ITEMS) : [];
    if (ids.length === 0) return NextResponse.json({ error: "no_products" }, { status: 400 });

    // Do'kon egaligini tekshirish
    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId }, select: { id: true },
    });
    if (!shop) return NextResponse.json({ error: "no_shop" }, { status: 404 });

    const products = await prisma.bnProduct.findMany({
        where: { id: { in: ids }, shopId: shop.id },
        select: { id: true, price: true, oldPrice: true },
    });
    if (products.length === 0) return NextResponse.json({ error: "no_matching_products" }, { status: 404 });

    // Remove flow
    if (body?.remove) {
        const results = await Promise.all(products.map(async p => {
            if (!p.oldPrice || p.oldPrice <= p.price) return { id: p.id, changed: false };
            await prisma.bnProduct.update({
                where: { id: p.id }, data: { price: p.oldPrice, oldPrice: null },
            });
            return { id: p.id, changed: true, newPrice: p.oldPrice };
        }));
        const changed = results.filter(r => r.changed).length;
        return NextResponse.json({ ok: true, processed: products.length, changed, action: "removed" });
    }

    // Discount flow
    const pct = Math.floor(Number(body?.pct));
    if (!pct || pct < MIN_PCT || pct > MAX_PCT) {
        return NextResponse.json({
            error: "invalid_pct",
            message: `Chegirma ${MIN_PCT}% dan ${MAX_PCT}% gacha bo'lishi kerak.`,
        }, { status: 400 });
    }

    const results = await Promise.all(products.map(async p => {
        const original = p.oldPrice && p.oldPrice > p.price ? p.oldPrice : p.price;
        const newPrice = Math.round(original * (1 - pct / 100) / 100) * 100;
        if (newPrice < 100 || newPrice >= p.price) return { id: p.id, changed: false, reason: "no_effect" };
        await prisma.bnProduct.update({
            where: { id: p.id }, data: { price: newPrice, oldPrice: original },
        });
        return { id: p.id, changed: true, newPrice, oldPrice: original };
    }));

    const changed = results.filter(r => r.changed).length;
    return NextResponse.json({
        ok: true, processed: products.length, changed, pct, action: "applied",
        details: results,
    });
}
