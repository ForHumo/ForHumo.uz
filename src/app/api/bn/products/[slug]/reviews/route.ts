// BN mahsulot sharh — yozish + ko'rish.
// Yozish uchun: xaridor bu mahsulotni COMPLETED buyurtmadan olgan bo'lishi kerak.
//
//   GET  /api/bn/products/[slug]/reviews
//   POST /api/bn/products/[slug]/reviews  { rating: 1..5, text?, images?: string[] }

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { moderateOnCreate } from "@/lib/moderation";
import { grantAchievement } from "@/lib/achievements";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;
    const product = await prisma.bnProduct.findUnique({ where: { slug }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const reviews = await prisma.bnProductReview.findMany({
        where: { productId: product.id, hidden: false },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    // Muallif ma'lumoti
    const profileIds = [...new Set(reviews.map(r => r.profileId))];
    const profiles = profileIds.length ? await prisma.userProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, name: true, username: true, image: true },
    }) : [];
    const byId = new Map(profiles.map(p => [p.id, p]));

    const items = reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        images: r.images,
        createdAt: r.createdAt.toISOString(),
        author: byId.get(r.profileId) ? {
            name: byId.get(r.profileId)!.name,
            username: byId.get(r.profileId)!.username,
            image: byId.get(r.profileId)!.image,
        } : null,
    }));

    return NextResponse.json({ items, avgRating: items.reduce((s, r) => s + r.rating, 0) / (items.length || 1) });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { slug } = await params;

    const body = await req.json().catch(() => ({}));
    const rating = Math.max(1, Math.min(5, Math.floor(Number(body?.rating) || 0)));
    const text = String(body?.text ?? "").trim().slice(0, 2000) || null;
    const images = Array.isArray(body?.images) ? body.images.slice(0, 5).map(String) : [];

    if (rating < 1) return NextResponse.json({ error: "rating_required" }, { status: 400 });

    const product = await prisma.bnProduct.findUnique({ where: { slug }, select: { id: true, shopId: true } });
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // COMPLETED buyurtma tekshirish
    const orderItem = await prisma.bnOrderItem.findFirst({
        where: {
            productId: product.id,
            order: { buyerId: auth.profileId, status: "COMPLETED" },
        },
        select: { orderId: true },
    });
    if (!orderItem) {
        return NextResponse.json({ error: "no_completed_order" }, { status: 403 });
    }

    // Dublikat — bir foydalanuvchi bir mahsulot uchun bitta sharh
    try {
        const review = await prisma.bnProductReview.create({
            data: {
                productId: product.id,
                profileId: auth.profileId,
                orderId: orderItem.orderId,
                rating, text, images,
            },
        });

        // Do'kon rating denorm (yangi o'rtacha)
        const [agg] = await Promise.all([
            prisma.bnProductReview.aggregate({
                where: { productId: product.id, hidden: false },
                _avg: { rating: true },
                _count: { _all: true },
            }),
        ]);
        await prisma.bnProduct.update({
            where: { id: product.id },
            data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count._all },
        });

        // Birinchi sharh yutug'i (fail-safe)
        after(() => grantAchievement(auth.profileId, "bn.first_review"));

        // AI moderatsiya
        after(() => moderateOnCreate({
            module: "BN",
            targetType: "REVIEW",
            targetId: review.id,
            text: review.text ?? "",
            imageUrl: review.images?.[0] ?? null,
            kind: "sharh",
            authorId: auth.profileId,
        }));

        return NextResponse.json({ ok: true, review });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("P2002")) {
            return NextResponse.json({ error: "already_reviewed" }, { status: 409 });
        }
        return NextResponse.json({ error: "create_failed", detail: msg }, { status: 500 });
    }
}
