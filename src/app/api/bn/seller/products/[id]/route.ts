// PATCH — mahsulotni tahrir qilish. DELETE — soft (isActive=false).
// Faqat do'kon egasi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function PATCH(
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (typeof body?.title === "string" && body.title.trim().length >= 3) data.title = body.title.trim();
    if (typeof body?.description === "string") data.description = body.description.trim().slice(0, 2000) || null;
    if (body?.price != null) data.price = Math.max(0, Math.floor(Number(body.price)));
    if (body?.oldPrice !== undefined) data.oldPrice = body.oldPrice == null ? null : Math.max(0, Math.floor(Number(body.oldPrice)));
    if (body?.marketAvgPrice !== undefined) data.marketAvgPrice = body.marketAvgPrice == null ? null : Math.max(0, Math.floor(Number(body.marketAvgPrice)));
    if (body?.stock != null) data.stock = Math.max(0, Math.floor(Number(body.stock)));
    if (typeof body?.isNegotiable === "boolean") data.isNegotiable = body.isNegotiable;
    if (typeof body?.allowPickup === "boolean")   data.allowPickup = body.allowPickup;
    if (typeof body?.allowDelivery === "boolean") data.allowDelivery = body.allowDelivery;
    if (typeof body?.allowInspect === "boolean")  data.allowInspect = body.allowInspect;
    if (typeof body?.isActive === "boolean")      data.isActive = body.isActive;
    if (Array.isArray(body?.images)) data.images = body.images.slice(0, 10).map((s: unknown) => String(s)).filter(Boolean);
    if (body?.attributes && typeof body.attributes === "object") data.attributes = body.attributes;
    if (typeof body?.categorySlug === "string") {
        const cat = await prisma.bnCategory.findUnique({ where: { slug: body.categorySlug }, select: { id: true } });
        if (cat) data.categoryId = cat.id;
    }

    const updated = await prisma.bnProduct.update({ where: { id }, data });
    return NextResponse.json({ ok: true, product: updated });
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const product = await prisma.bnProduct.findUnique({
        where: { id },
        include: { shop: { select: { profileId: true, id: true } } },
    });
    if (!product || product.shop?.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!product.isActive) return NextResponse.json({ ok: true, alreadyRemoved: true });

    await prisma.bnProduct.update({ where: { id }, data: { isActive: false } });
    await prisma.bnShop.update({
        where: { id: product.shop!.id },
        data: { productCount: { decrement: 1 } },
    });
    return NextResponse.json({ ok: true });
}
