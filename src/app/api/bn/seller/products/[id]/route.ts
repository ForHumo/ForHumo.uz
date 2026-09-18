// PATCH — mahsulotni tahrir qilish. DELETE — soft (isActive=false).
// Faqat do'kon egasi.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { parseTiers } from "@/lib/bn-wholesale";
import { translateAndIndexProduct } from "@/lib/bn-i18n-product";

// Mahsulot o'zgarsa cache'langan sahifalar (mahsulot/do'kon/home) darhol yangilanadi
// — 60s revalidate kutmasdan. Yuklama cache'i saqlanadi, lekin sotuvchi o'z
// o'zgarishini shu zahoti ko'radi.
function revalidateBnProduct() {
    try { revalidateTag("bn-products"); revalidateTag("bn-shops"); } catch { /* fail-safe */ }
}

// GET — mahsulotning joriy moslik ma'lumoti (fit-tahrirlash modal uchun).
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const product = await prisma.bnProduct.findUnique({
        where: { id },
        select: {
            id: true, partNumber: true, oemNumbers: true, universalFit: true,
            shop: { select: { profileId: true } },
            fits: { select: { modelId: true, model: { select: { name: true, make: { select: { name: true } } } } } },
        },
    });
    if (!product || product.shop?.profileId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({
        partNumber: product.partNumber ?? "",
        oemNumbers: product.oemNumbers ?? [],
        universalFit: product.universalFit ?? false,
        fits: product.fits.map(f => ({ modelId: f.modelId, makeName: f.model.make.name, modelName: f.model.name })),
    });
}

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
    if (typeof body?.isMature === "boolean") data.isMature = body.isMature;
    if (typeof body?.isWholesale === "boolean") {
        data.isWholesale = body.isWholesale;
        if (!body.isWholesale) {
            data.minWholesaleQty = null;
            data.wholesaleTiers = [];
        }
    }
    if (body?.minWholesaleQty !== undefined) {
        data.minWholesaleQty = body.minWholesaleQty == null ? null : Math.max(2, Math.floor(Number(body.minWholesaleQty)));
    }
    if (body?.wholesaleTiers !== undefined) {
        data.wholesaleTiers = parseTiers(body.wholesaleTiers);
    }

    // Avto moslik maydonlari
    if (body?.partNumber !== undefined) {
        data.partNumber = typeof body.partNumber === "string" ? (body.partNumber.trim().slice(0, 64) || null) : null;
    }
    if (body?.oemNumbers !== undefined) {
        data.oemNumbers = Array.isArray(body.oemNumbers)
            ? [...new Set(body.oemNumbers.map((s: unknown) => String(s).trim()).filter(Boolean))].slice(0, 20)
            : [];
    }
    if (typeof body?.universalFit === "boolean") {
        data.universalFit = body.universalFit;
    }

    const updated = await prisma.bnProduct.update({ where: { id }, data });

    // Moslik yozuvlarini sinxronlash — `fits` yuborilsa to'liq almashtiramiz.
    // universalFit=true bo'lsa barcha fitlar o'chiriladi (universal — model kerak emas).
    if (body?.universalFit === true) {
        await prisma.bnProductFit.deleteMany({ where: { productId: id } });
    } else if (Array.isArray(body?.fits)) {
        const modelIds = [...new Set(body.fits.map((f: unknown) => String((f as { modelId?: unknown })?.modelId ?? "")).filter(Boolean))].slice(0, 60) as string[];
        const valid = modelIds.length
            ? (await prisma.bnCarModel.findMany({ where: { id: { in: modelIds }, isActive: true }, select: { id: true } })).map(m => m.id)
            : [];
        await prisma.bnProductFit.deleteMany({ where: { productId: id } });
        if (valid.length) {
            await prisma.bnProductFit.createMany({
                data: valid.map(modelId => ({ productId: id, modelId })),
                skipDuplicates: true,
            });
        }
    }

    revalidateBnProduct();

    // Agar title yoki description o'zgargan bo'lsa — 3 tilga tarjima va searchIndex qayta hisoblansin.
    if (data.title !== undefined || data.description !== undefined) {
        after(() => translateAndIndexProduct(id));
    }

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
    revalidateBnProduct();
    return NextResponse.json({ ok: true });
}
