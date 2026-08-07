// BN do'kon sharh — yozish + ko'rish.
// Yozish uchun: xaridor bu do'kondan COMPLETED buyurtma olgan bo'lishi kerak.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { moderateOnCreate } from "@/lib/moderation";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;
    const shop = await prisma.bnShop.findUnique({ where: { slug }, select: { id: true } });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const reviews = await prisma.bnShopReview.findMany({
        where: { shopId: shop.id, hidden: false },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

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
        createdAt: r.createdAt.toISOString(),
        author: byId.get(r.profileId) ? {
            name: byId.get(r.profileId)!.name,
            username: byId.get(r.profileId)!.username,
            image: byId.get(r.profileId)!.image,
        } : null,
    }));

    return NextResponse.json({ items });
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
    if (rating < 1) return NextResponse.json({ error: "rating_required" }, { status: 400 });

    const shop = await prisma.bnShop.findUnique({ where: { slug }, select: { id: true } });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const order = await prisma.bnOrder.findFirst({
        where: { shopId: shop.id, buyerId: auth.profileId, status: "COMPLETED" },
        select: { id: true },
    });
    if (!order) return NextResponse.json({ error: "no_completed_order" }, { status: 403 });

    try {
        const review = await prisma.bnShopReview.create({
            data: { shopId: shop.id, profileId: auth.profileId, orderId: order.id, rating, text },
        });

        const agg = await prisma.bnShopReview.aggregate({
            where: { shopId: shop.id, hidden: false },
            _avg: { rating: true }, _count: { _all: true },
        });
        await prisma.bnShop.update({
            where: { id: shop.id },
            data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count._all },
        });

        after(() => moderateOnCreate({
            module: "BN", targetType: "REVIEW", targetId: review.id,
            text: review.text ?? "", kind: "do'kon sharhi",
            authorId: auth.profileId,
        }));

        return NextResponse.json({ ok: true, review });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("P2002")) return NextResponse.json({ error: "already_reviewed" }, { status: 409 });
        return NextResponse.json({ error: "create_failed", detail: msg }, { status: 500 });
    }
}
