// Sotuvchi buyurtma statusini o'zgartiradi. Faqat do'kon egasi (BnShop.profileId)
// yoki BN OWNER admin.
//
// Ruxsat etilgan o'tishlar:
//   PLACED     → CONFIRMED, CANCELLED
//   CONFIRMED  → READY, CANCELLED
//   READY      → COMPLETED, CANCELLED
//   (COMPLETED / CANCELLED — terminal)
//
// COMPLETED bo'lganda settleOrder chaqiriladi (escrow → sotuvchiga, komissiya ayirilgan).
// CANCELLED bo'lganda refundOrder chaqiriladi (xaridorga qaytadi).
//
// POST /api/bn/orders/[id]/status   body: { status: "CONFIRMED"|"READY"|"COMPLETED"|"CANCELLED", reason?: string }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { refundOrder, settleOrder } from "@/lib/bn-settle";

const ALLOWED_FROM: Record<string, Set<string>> = {
    PLACED:    new Set(["CONFIRMED", "CANCELLED"]),
    CONFIRMED: new Set(["READY", "CANCELLED"]),
    READY:     new Set(["COMPLETED", "CANCELLED"]),
};

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const next = String(body?.status ?? "");
    const reason = String(body?.reason ?? "").trim().slice(0, 200) || null;

    if (!["CONFIRMED", "READY", "COMPLETED", "CANCELLED"].includes(next)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const order = await prisma.bnOrder.findUnique({
        where: { id },
        include: { shop: { select: { profileId: true } } },
    });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Ruxsat: do'kon egasi YOKI BN OWNER admin
    const isShopOwner = order.shop?.profileId === auth.profileId;
    let isAdmin = false;
    if (!isShopOwner) {
        const admin = await prisma.bnAdmin.findUnique({
            where: { profileId: auth.profileId },
            select: { role: true },
        });
        isAdmin = admin?.role === "OWNER" || admin?.role === "MODERATOR";
    }
    if (!isShopOwner && !isAdmin) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const allowed = ALLOWED_FROM[order.status];
    if (!allowed?.has(next)) {
        return NextResponse.json({ error: "invalid_transition", from: order.status, to: next }, { status: 409 });
    }

    // Timestampni yozamiz
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { status: next };
    if (next === "CONFIRMED") update.confirmedAt = now;
    if (next === "READY")     update.readyAt = now;
    if (next === "COMPLETED") update.completedAt = now;
    if (next === "CANCELLED") { update.cancelledAt = now; update.cancelReason = reason ?? "Sotuvchi bekor qildi"; }

    await prisma.bnOrder.update({ where: { id: order.id }, data: update });

    // Escrow harakati
    if (next === "COMPLETED") {
        const s = await settleOrder(order.id);
        return NextResponse.json({ ok: true, settled: s.ok, reason: s.reason });
    }
    if (next === "CANCELLED") {
        const r = await refundOrder(order.id);
        return NextResponse.json({ ok: true, refunded: r.ok, reason: r.reason });
    }

    return NextResponse.json({ ok: true });
}
