// BN sevimlilar API. Faqat kirganlar uchun.
//
//   GET   /api/bn/favorites                     — barcha saqlangan mahsulotlar
//   POST  /api/bn/favorites   { productId }     — TOGGLE (bor bo'lsa o'chadi, yo'q bo'lsa qo'shiladi)
//   GET   /api/bn/favorites?ids=id1,id2,...     — bir necha mahsulot statusini bir requestda tekshirish
//                                                  { statuses: {id: boolean} }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth, getBnAuth } from "@/lib/bn-auth";

// PATCH /api/bn/favorites { productId, privacy: PRIVATE|FOLLOWERS|PUBLIC }
export async function PATCH(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "");
    const privacy = ["PRIVATE", "FOLLOWERS", "PUBLIC"].includes(body?.privacy) ? body.privacy : "PRIVATE";
    if (!productId) return NextResponse.json({ error: "productId_required" }, { status: 400 });
    const upd = await prisma.bnFavorite.updateMany({
        where: { profileId: auth.profileId, productId },
        data:  { privacy },
    });
    return NextResponse.json({ ok: true, updated: upd.count });
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");

    // Batch status tekshiruv — mahsulot detali sahifasi uchun
    if (idsParam) {
        const auth = await getBnAuth();
        if (!auth) return NextResponse.json({ statuses: {} });
        const ids = idsParam.split(",").filter(Boolean).slice(0, 100);
        if (ids.length === 0) return NextResponse.json({ statuses: {} });
        const rows = await prisma.bnFavorite.findMany({
            where: { profileId: auth.profileId, productId: { in: ids } },
            select: { productId: true },
        });
        const set = new Set(rows.map(r => r.productId));
        const statuses = Object.fromEntries(ids.map(id => [id, set.has(id)]));
        return NextResponse.json({ statuses });
    }

    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const favs = await prisma.bnFavorite.findMany({
        where: { profileId: auth.profileId },
        orderBy: { createdAt: "desc" },
    });

    const productIds = favs.map(f => f.productId);
    const products = productIds.length ? await prisma.bnProduct.findMany({
        where: { id: { in: productIds } },
        include: {
            shop: { select: { slug: true, name: true, tier: true, city: true, market: { select: { name: true } } } },
        },
    }) : [];
    const byId = new Map(products.map(p => [p.id, p]));

    const items = favs
        .map(f => {
            const p = byId.get(f.productId);
            if (!p || !p.isActive || p.hidden) return null;
            return {
                id: f.id,
                createdAt: f.createdAt,
                product: {
                    id: p.id, slug: p.slug, title: p.title, price: p.price,
                    oldPrice: p.oldPrice, marketAvgPrice: p.marketAvgPrice,
                    images: p.images, stock: p.stock,
                    allowDelivery: p.allowDelivery, allowInspect: p.allowInspect,
                    isNegotiable: p.isNegotiable,
                    shopSlug: p.shop?.slug ?? "", shopName: p.shop?.name ?? "",
                    marketName: p.shop?.market?.name ?? null,
                    city: p.shop?.city ?? "Toshkent",
                    rating: p.rating, ratingCount: p.ratingCount,
                    shopVerified: p.shop?.tier === "VERIFIED" || p.shop?.tier === "PREMIUM",
                    categorySlug: "", district: null, branchName: null,
                    description: p.description, attributes: p.attributes,
                    allowPickup: p.allowPickup,
                },
            };
        })
        .filter(Boolean);

    return NextResponse.json({ items, count: items.length });
}

/** Toggle — qaytaradi { favored: boolean, count: number } */
export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "");
    if (!productId) return NextResponse.json({ error: "productId_required" }, { status: 400 });

    const existing = await prisma.bnFavorite.findUnique({
        where: { profileId_productId: { profileId: auth.profileId, productId } },
    });

    let favored: boolean;
    if (existing) {
        await prisma.bnFavorite.delete({ where: { id: existing.id } });
        favored = false;
    } else {
        // Mahsulot mavjudligini tekshiramiz
        const exists = await prisma.bnProduct.count({ where: { id: productId } });
        if (!exists) return NextResponse.json({ error: "product_not_found" }, { status: 404 });
        try {
            await prisma.bnFavorite.create({ data: { profileId: auth.profileId, productId } });
            favored = true;
        } catch {
            // race condition — qayta yaratish urinishi, allaqachon bor
            favored = true;
        }
    }

    const count = await prisma.bnFavorite.count({ where: { profileId: auth.profileId } });
    return NextResponse.json({ ok: true, favored, count });
}
