// Sotuvchi qaytarish so'roviga qaror qiladi.
//
//   POST /api/bn/returns/[id]/decide   body: { status: "APPROVED"|"REJECTED", note? }
//   Xaridor: /api/bn/returns/[id] DELETE — o'z so'rovini bekor qilish

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { bnNotify } from "@/lib/bn-notify";
import { refundOrder } from "@/lib/bn-settle";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const decision = String(body?.status ?? "");
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;
    if (!["APPROVED", "REJECTED"].includes(decision)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const ret = await prisma.bnReturn.findUnique({ where: { id } });
    if (!ret) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (ret.status !== "REQUESTED") {
        return NextResponse.json({ error: "already_decided", status: ret.status }, { status: 409 });
    }
    // Sotuvchi bo'lishini tekshirish
    const order = await prisma.bnOrder.findUnique({
        where: { id: ret.orderId },
        include: { shop: { select: { profileId: true } }, items: true },
    });
    if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    if (order.shop?.profileId !== auth.profileId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const now = new Date();
    await prisma.bnReturn.update({
        where: { id },
        data: {
            status: decision as "APPROVED" | "REJECTED",
            decidedById: auth.profileId,
            decidedAt: now,
            decisionNote: note,
        },
    });

    // APPROVED → pul qaytarish (WALLET bo'lgan bo'lsa), stock tiklash
    let refunded = false;
    if (decision === "APPROVED") {
        // Stock tiklash
        for (const item of order.items) {
            await prisma.bnProduct.update({
                where: { id: item.productId },
                data: {
                    stock: { increment: item.qty },
                    sold: { decrement: Math.min(item.qty, 999999) },
                },
            }).catch(() => {});
        }
        // Pul qaytarish
        if (order.paymentMethod === "WALLET" && order.escrowHeld && !order.settledAt) {
            const r = await refundOrder(order.id);
            refunded = r.ok;
        }
        await prisma.bnReturn.update({
            where: { id }, data: { refunded },
        });
    }

    // Xaridorga bildirishnoma
    after(async () => {
        await bnNotify({
            profileId: ret.buyerId,
            type: "RETURN_DECIDED",
            title: decision === "APPROVED" ? "Qaytarish qabul qilindi" : "Qaytarish rad etildi",
            body: `${order.code}${note ? " — " + note : ""}`,
            link: "/buyurtmalarim",
        });
    });

    return NextResponse.json({ ok: true, refunded });
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const ret = await prisma.bnReturn.findUnique({ where: { id } });
    if (!ret || ret.buyerId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (ret.status !== "REQUESTED") {
        return NextResponse.json({ error: "already_decided" }, { status: 409 });
    }
    await prisma.bnReturn.update({
        where: { id }, data: { status: "CANCELLED" },
    });
    return NextResponse.json({ ok: true });
}
