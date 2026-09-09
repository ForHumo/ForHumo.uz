// BN xaridlar API — foydalanuvchi o'z xaridlari (offline+online).
//   GET  /api/bn/purchases  — mening xaridlarim (paginated)
//   POST /api/bn/purchases  — offline xaridni qo'lda kiritish
//     body: { shopSlug, productId?, title, quantity?, unit?, priceUzs?, purchasedAt? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateExpiresAt } from "@/lib/bn-shelf-life";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
}

export async function GET(req: Request) {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
    const skip = Math.max(0, parseInt(url.searchParams.get("skip") ?? "0"));

    const [items, total] = await Promise.all([
        prisma.bnPurchase.findMany({
            where: { profileId: profile.id, hidden: false },
            orderBy: { purchasedAt: "desc" },
            take: limit,
            skip,
            include: {
                shop: { select: { slug: true, name: true, market: { select: { name: true, slug: true } } } },
                product: { select: { slug: true, images: true } },
            },
        }),
        prisma.bnPurchase.count({ where: { profileId: profile.id, hidden: false } }),
    ]);

    return NextResponse.json({
        items: items.map(p => ({
            id: p.id,
            title: p.title,
            quantity: p.quantity,
            unit: p.unit,
            priceUzs: p.priceUzs,
            purchasedAt: p.purchasedAt,
            expiresAt: p.expiresAt,
            source: p.source,
            shop: p.shop ? {
                slug: p.shop.slug, name: p.shop.name,
                marketName: p.shop.market?.name ?? null,
                marketSlug: p.shop.market?.slug ?? null,
            } : null,
            product: p.product ? { slug: p.product.slug, image: p.product.images?.[0] ?? null } : null,
        })),
        total,
        hasMore: skip + items.length < total,
    });
}

export async function POST(req: Request) {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const shopSlug = typeof body.shopSlug === "string" ? body.shopSlug.trim() : "";
    const productId = typeof body.productId === "string" ? body.productId.trim() : null;
    const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
    const quantity = Math.max(1, Math.min(999, parseInt(String(body.quantity ?? 1)) || 1));
    const unit = typeof body.unit === "string" ? body.unit.trim().slice(0, 12) : null;
    const priceUzs = Math.max(0, Math.min(100_000_000, parseInt(String(body.priceUzs ?? 0)) || 0));
    const source = shopSlug ? "OFFLINE_QR" : "OFFLINE_MANUAL";

    let shopId: string | null = null;
    if (shopSlug) {
        const shop = await prisma.bnShop.findUnique({ where: { slug: shopSlug }, select: { id: true } });
        if (!shop) return NextResponse.json({ error: "shop_not_found" }, { status: 404 });
        shopId = shop.id;
    }

    let productData: { title: string; categorySlug: string | null } | null = null;
    if (productId) {
        const prod = await prisma.bnProduct.findUnique({
            where: { id: productId },
            select: { title: true, shopId: true, category: { select: { slug: true } } },
        });
        if (!prod) return NextResponse.json({ error: "product_not_found" }, { status: 404 });
        // Agar productId shopId'ga tegishli emas bo'lsa — ignore product
        if (shopId && prod.shopId !== shopId) {
            return NextResponse.json({ error: "product_shop_mismatch" }, { status: 400 });
        }
        productData = { title: prod.title, categorySlug: prod.category?.slug ?? null };
    }

    const title = (productData?.title ?? rawTitle).trim();
    if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });

    const purchasedAt = body.purchasedAt ? new Date(body.purchasedAt) : new Date();
    if (isNaN(purchasedAt.getTime())) return NextResponse.json({ error: "invalid_date" }, { status: 400 });

    const categorySlug = productData?.categorySlug ?? null;
    const expiresAt = estimateExpiresAt(title, categorySlug, purchasedAt);

    const purchase = await prisma.bnPurchase.create({
        data: {
            profileId: profile.id,
            shopId,
            productId,
            title: title.slice(0, 200),
            categorySlug,
            quantity,
            unit,
            priceUzs,
            purchasedAt,
            expiresAt,
            source,
        },
    });

    return NextResponse.json({ ok: true, id: purchase.id, expiresAt: purchase.expiresAt });
}

export async function DELETE(req: Request) {
    const profile = await requireProfile();
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    await prisma.bnPurchase.updateMany({
        where: { id, profileId: profile.id },
        data: { hidden: true },
    });
    return NextResponse.json({ ok: true });
}
