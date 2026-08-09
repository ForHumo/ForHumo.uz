// Sotuvchi mahsulot variantlarini boshqaradi (rang/o'lcham/xotira).
//
//   GET    /api/bn/seller/products/[id]/variants        — ro'yxat
//   POST   /api/bn/seller/products/[id]/variants        — yaratish {name, price, stock, image?, sort?}
//   PATCH  /api/bn/seller/products/[id]/variants        — bulk update [{id, ...}]
//   DELETE /api/bn/seller/products/[id]/variants?vid=X  — bittasini o'chirish

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

async function requireOwner(productId: string, profileId: string) {
    const p = await prisma.bnProduct.findUnique({
        where: { id: productId },
        include: { shop: { select: { profileId: true } } },
    });
    if (!p || p.shop?.profileId !== profileId) return null;
    return p;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const p = await requireOwner(id, auth.profileId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const variants = await prisma.bnProductVariant.findMany({
        where: { productId: id },
        orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ variants });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const p = await requireOwner(id, auth.profileId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const price = Math.max(0, Math.floor(Number(body?.price) || 0));
    const oldPrice = body?.oldPrice != null ? Math.max(0, Math.floor(Number(body.oldPrice))) : null;
    const stock = Math.max(0, Math.floor(Number(body?.stock) || 0));
    const image = typeof body?.image === "string" ? body.image : null;
    const sort = Math.max(0, Math.floor(Number(body?.sort) || 0));

    if (name.length < 1) return NextResponse.json({ error: "name_required" }, { status: 400 });
    if (price < 1) return NextResponse.json({ error: "price_required" }, { status: 400 });

    const variant = await prisma.bnProductVariant.create({
        data: { productId: id, name, price, oldPrice, stock, image, sort },
    });
    // Mahsulot base price ni yangilash — eng arzon variant
    await syncProductPriceStock(id);
    return NextResponse.json({ ok: true, variant });
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const p = await requireOwner(id, auth.profileId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    for (const u of updates) {
        if (!u?.id) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d: any = {};
        if (typeof u.name === "string") d.name = u.name.trim();
        if (u.price != null) d.price = Math.max(0, Math.floor(Number(u.price)));
        if (u.oldPrice !== undefined) d.oldPrice = u.oldPrice == null ? null : Math.max(0, Math.floor(Number(u.oldPrice)));
        if (u.stock != null) d.stock = Math.max(0, Math.floor(Number(u.stock)));
        if (u.image !== undefined) d.image = typeof u.image === "string" ? u.image : null;
        if (u.sort != null) d.sort = Math.max(0, Math.floor(Number(u.sort)));
        await prisma.bnProductVariant.updateMany({
            where: { id: u.id, productId: id },
            data: d,
        });
    }
    await syncProductPriceStock(id);
    return NextResponse.json({ ok: true });
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const p = await requireOwner(id, auth.profileId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const vid = searchParams.get("vid");
    if (!vid) return NextResponse.json({ error: "vid_required" }, { status: 400 });

    await prisma.bnProductVariant.deleteMany({ where: { id: vid, productId: id } });
    await syncProductPriceStock(id);
    return NextResponse.json({ ok: true });
}

// Mahsulot price/stock ni variantlar asosida yangilaydi.
async function syncProductPriceStock(productId: string) {
    const variants = await prisma.bnProductVariant.findMany({
        where: { productId },
        select: { price: true, stock: true },
    });
    if (variants.length === 0) return;   // variantsiz — o'zgartirilmasin
    const minPrice = Math.min(...variants.map(v => v.price));
    const totalStock = variants.reduce((s, v) => s + v.stock, 0);
    await prisma.bnProduct.update({
        where: { id: productId },
        data: { price: minPrice, stock: totalStock },
    });
}
