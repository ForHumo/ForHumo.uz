// Sotuvchi kabinet uchun paginated buyurtma ro'yxati.
// Faqat do'kon egasi (yoki BN admin) o'z buyurtmalarini oladi.
//
// GET /api/bn/orders/seller?status=PLACED&skip=0&limit=20
//   status: PLACED | CONFIRMED | READY | COMPLETED | CANCELLED | "" (barchasi)
//   skip:   pagination offset (default 0)
//   limit:  1..50 (default 20)
//
// Javob: { orders: CabinetOrder[], hasMore, total? }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import type { BnOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS: BnOrderStatus[] = ["PLACED", "CONFIRMED", "READY", "COMPLETED", "CANCELLED"];

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    // Foydalanuvchining do'koni bormi?
    const shop = await prisma.bnShop.findFirst({
        where: { profileId: auth.profileId },
        select: { id: true, status: true },
    });
    if (!shop) return NextResponse.json({ error: "no_shop" }, { status: 403 });
    if (shop.status !== "APPROVED") return NextResponse.json({ error: "not_approved" }, { status: 403 });

    const url = new URL(req.url);
    const statusParam = (url.searchParams.get("status") ?? "").toUpperCase().trim();
    const skip = Math.max(0, Number(url.searchParams.get("skip") ?? "0") || 0);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { shopId: shop.id };
    if (statusParam && ALLOWED_STATUS.includes(statusParam as BnOrderStatus)) {
        where.status = statusParam;
    }

    const [items] = await Promise.all([
        prisma.bnOrder.findMany({
            where,
            orderBy: { placedAt: "desc" },
            skip,
            take: limit,
            include: {
                items: { select: { imageUrl: true, title: true, qty: true, price: true, variantName: true } },
                _count: { select: { items: true } },
            },
        }),
    ]);

    const orders = items.map(o => ({
        id: o.id,
        code: o.code,
        status: o.status,
        total: o.total,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        placedAt: o.placedAt.toISOString(),
        confirmedAt: o.confirmedAt?.toISOString() ?? null,
        readyAt: o.readyAt?.toISOString() ?? null,
        completedAt: o.completedAt?.toISOString() ?? null,
        cancelledAt: o.cancelledAt?.toISOString() ?? null,
        cancelReason: o.cancelReason,
        fulfillType: o.fulfillType,
        itemCount: o._count.items,
        firstImage: o.items[0]?.imageUrl ?? null,
        firstTitle: o.items[0]?.title ?? null,
        items: o.items.map(it => ({
            title: it.title,
            price: it.price,
            qty: it.qty,
            imageUrl: it.imageUrl,
            variantName: it.variantName,
        })),
        phone: o.phone,
        address: o.address,
        note: o.note,
    }));

    return NextResponse.json({
        orders,
        hasMore: orders.length === limit,
    });
}
