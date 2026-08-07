// Sotuvchi o'z do'kon buyurtmalarini ko'radi. Status filtri bilan.
//
// GET /api/bn/seller/orders?status=PLACED&limit=50

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const shop = await prisma.bnShop.findUnique({
        where: { profileId: auth.profileId }, select: { id: true, status: true },
    });
    if (!shop || shop.status !== "APPROVED") {
        return NextResponse.json({ error: "no_shop" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(200, Number(searchParams.get("limit")) || 50);

    const orders = await prisma.bnOrder.findMany({
        where: {
            shopId: shop.id,
            ...(status ? { status: status as "PLACED" | "CONFIRMED" | "READY" | "COMPLETED" | "CANCELLED" | "DISPUTED" } : {}),
        },
        orderBy: { placedAt: "desc" },
        take: limit,
        include: {
            items: { take: 1, select: { imageUrl: true, title: true } },
            _count: { select: { items: true } },
        },
    });

    return NextResponse.json({ orders });
}
