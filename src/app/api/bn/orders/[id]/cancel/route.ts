// Xaridor buyurtmani bekor qiladi. Faqat PLACED holatida (sotuvchi tasdiqlamagan).
// WALLET bo'lsa — refundOrder chaqiriladi (pul qaytadi).
//
// POST /api/bn/orders/[id]/cancel   body: { reason?: string }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { refundOrder } from "@/lib/bn-settle";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason ?? "").trim().slice(0, 200) || "Xaridor bekor qildi";

    const order = await prisma.bnOrder.findUnique({
        where: { id },
        select: { id: true, buyerId: true, status: true, paymentMethod: true },
    });
    if (!order || order.buyerId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (order.status !== "PLACED") {
        return NextResponse.json({ error: "cannot_cancel", currentStatus: order.status }, { status: 409 });
    }

    await prisma.bnOrder.update({
        where: { id: order.id },
        data:  { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });

    // WALLET bo'lsa — pul qaytariladi + stok tiklanadi (refundOrder ichida)
    const refund = await refundOrder(order.id);

    return NextResponse.json({ ok: true, refunded: refund.ok });
}
