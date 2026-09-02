// BN buyurtma tugagach — sotuvchi rating qoldirish.
// COMPLETED buyurtma ustidan xaridor 1-marta ovoz beradi. Keyingi buyurtmalarda
// eski sharh yangilanadi (upsert). BnShopReview.unique([shopId, profileId]).
//
// POST /api/bn/orders/[id]/rate  body: { rating: 1-5, text?: string }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { bnNotify } from "@/lib/bn-notify";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const rating = Math.max(1, Math.min(5, Math.floor(Number(body?.rating) || 0)));
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1000) : "";

    if (!rating) return NextResponse.json({ error: "invalid_rating" }, { status: 400 });

    const order = await prisma.bnOrder.findUnique({
        where: { id },
        select: { id: true, buyerId: true, status: true, shopId: true, shop: { select: { profileId: true, name: true } } },
    });
    if (!order || order.buyerId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (order.status !== "COMPLETED") {
        return NextResponse.json({ error: "order_not_completed" }, { status: 409 });
    }

    // Upsert — bir do'kon uchun bir profil bir sharh (unique(shopId,profileId))
    const review = await prisma.bnShopReview.upsert({
        where: { shopId_profileId: { shopId: order.shopId, profileId: auth.profileId } },
        create: {
            shopId: order.shopId,
            profileId: auth.profileId,
            orderId: order.id,
            rating,
            text: text || null,
        },
        update: {
            rating,
            text: text || null,
            orderId: order.id,
            hidden: false,
        },
        select: { id: true, rating: true, text: true, createdAt: true },
    });

    // Do'kon aggregate rating qayta hisoblash (fail-safe)
    void prisma.bnShopReview.aggregate({
        where: { shopId: order.shopId, hidden: false },
        _avg: { rating: true },
        _count: true,
    }).then(agg => {
        prisma.bnShop.update({
            where: { id: order.shopId },
            data: {
                rating: agg._avg.rating ?? 0,
                ratingCount: agg._count,
            },
        }).catch(() => null);
    }).catch(() => null);

    // Do'kon egasiga bildirishnoma
    if (order.shop?.profileId) {
        void bnNotify({
            profileId: order.shop.profileId,
            type: "REVIEW_RECEIVED",
            title: `Yangi sharh — ${rating} yulduz`,
            body: text ? text.slice(0, 100) : `Xaridor ${rating}-yulduz baholadi`,
            link: `/kabinet/sotuvchi/reviews`,
        }).catch(() => null);
    }

    return NextResponse.json({ ok: true, review });
}
