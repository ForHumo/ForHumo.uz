// BN buyurtma "live" endpoint — client-side polling uchun.
// Faqat status + timestamplarni qaytaradi (kichkina payload, tez).
// Auth: buyurtma egasi (buyer) yoki sotuvchi (shop owner) ko'ra oladi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { checkOrderTimeout } from "@/lib/bn-order-timeout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    // Lazy timeout check — polling har chaqirilganda tekshirilsin
    await checkOrderTimeout(id).catch(() => null);

    const o = await prisma.bnOrder.findUnique({
        where: { id },
        select: {
            id: true, status: true, buyerId: true,
            placedAt: true, confirmedAt: true, readyAt: true, completedAt: true,
            paymentStatus: true, cancelReason: true,
            shop: { select: { profileId: true } },
        },
    });
    if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Faqat xaridor yoki do'kon egasi ko'ra oladi
    if (o.buyerId !== auth.profileId && o.shop?.profileId !== auth.profileId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return NextResponse.json({
        id: o.id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        cancelReason: o.cancelReason,
        placedAt: o.placedAt?.toISOString() ?? null,
        confirmedAt: o.confirmedAt?.toISOString() ?? null,
        readyAt: o.readyAt?.toISOString() ?? null,
        completedAt: o.completedAt?.toISOString() ?? null,
    });
}
