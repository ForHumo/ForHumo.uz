// BN savat API. Faqat kirganlar uchun.
//
//   GET     /api/bn/cart              — barcha itemlar (mahsulot bilan)
//   POST    /api/bn/cart               — qo'shish {productId, qty?}
//   PATCH   /api/bn/cart               — qty o'zgartirish {id, qty}
//   DELETE  /api/bn/cart?id=<itemId>   — o'chirish
//
// Idempotent qo'shish: profileId+productId unique — qayta bosilsa qty += qty
// yoki mavjud qiymatga tenglashadi (POST body'ida `set: true` bo'lsa).

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { trackBnEvent } from "@/lib/bn-events";

export async function GET() {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const items = await prisma.bnCartItem.findMany({
        where: { profileId: auth.profileId },
        orderBy: { createdAt: "desc" },
    });

    // Mahsulot ma'lumotini qo'shib qaytaramiz (BnCartItem'da FK relation yo'q)
    const productIds = items.map(i => i.productId);
    const products = productIds.length ? await prisma.bnProduct.findMany({
        where: { id: { in: productIds } },
        include: {
            shop: { select: { slug: true, name: true, tier: true, city: true, market: { select: { name: true, slug: true } } } },
        },
    }) : [];
    const byId = new Map(products.map(p => [p.id, p]));

    const enriched = items
        .map(i => {
            const p = byId.get(i.productId);
            if (!p) return null;
            return {
                id: i.id,
                qty: i.qty,
                createdAt: i.createdAt,
                product: {
                    id: p.id, slug: p.slug, title: p.title, price: p.price,
                    marketAvgPrice: p.marketAvgPrice, images: p.images,
                    stock: p.stock, allowDelivery: p.allowDelivery, allowInspect: p.allowInspect,
                    isActive: p.isActive, hidden: p.hidden,
                    shopSlug: p.shop?.slug ?? "", shopName: p.shop?.name ?? "",
                    marketName: p.shop?.market?.name ?? null,
                    city: p.shop?.city ?? "Toshkent",
                },
            };
        })
        .filter(Boolean);

    return NextResponse.json({ items: enriched, count: enriched.length });
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "");
    const qty = Math.max(1, Math.min(99, Number(body?.qty) || 1));
    const set = body?.set === true;

    if (!productId) return NextResponse.json({ error: "productId_required" }, { status: 400 });

    const product = await prisma.bnProduct.findUnique({
        where: { id: productId },
        select: { id: true, stock: true, isActive: true, hidden: true },
    });
    if (!product || !product.isActive || product.hidden) {
        return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
    }
    if (product.stock < 1) {
        return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
    }

    const existing = await prisma.bnCartItem.findUnique({
        where: { profileId_productId: { profileId: auth.profileId, productId } },
    });

    const targetQty = set ? qty : Math.min(product.stock, (existing?.qty ?? 0) + qty);

    const item = await prisma.bnCartItem.upsert({
        where: { profileId_productId: { profileId: auth.profileId, productId } },
        update: { qty: targetQty },
        create: { profileId: auth.profileId, productId, qty: targetQty },
    });

    const count = await prisma.bnCartItem.count({ where: { profileId: auth.profileId } });
    // Rekomendatsiya signali (fail-safe, javobni kechiktirmaydi)
    after(() => trackBnEvent({ profileId: auth.profileId, productId, type: "CART" }));
    return NextResponse.json({ ok: true, item, count });
}

export async function PATCH(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "");
    const qty = Math.max(1, Math.min(99, Number(body?.qty) || 1));
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    const item = await prisma.bnCartItem.findUnique({ where: { id } });
    if (!item || item.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const product = await prisma.bnProduct.findUnique({
        where: { id: item.productId },
        select: { stock: true },
    });
    const capped = Math.min(qty, product?.stock ?? qty);

    const updated = await prisma.bnCartItem.update({
        where: { id },
        data: { qty: capped },
    });
    return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "1";

    if (all) {
        await prisma.bnCartItem.deleteMany({ where: { profileId: auth.profileId } });
        return NextResponse.json({ ok: true, count: 0 });
    }

    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    const item = await prisma.bnCartItem.findUnique({ where: { id } });
    if (!item || item.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await prisma.bnCartItem.delete({ where: { id } });
    const count = await prisma.bnCartItem.count({ where: { profileId: auth.profileId } });
    return NextResponse.json({ ok: true, count });
}
