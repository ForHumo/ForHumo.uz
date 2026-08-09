// BN qaytarish (return) — xaridor mahsulotni qaytarish so'rovi.
//
//   POST /api/bn/returns  { orderId, reason, detail?, images? }
//     — Xaridor buyurtmani qaytarish so'raydi. Faqat COMPLETED yoki READY orderdan.
//   GET  /api/bn/returns          — mening so'rovlarim (xaridor)
//   GET  /api/bn/returns?shop=1   — do'konimga tegishli so'rovlar (sotuvchi)

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { bnNotify } from "@/lib/bn-notify";

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId ?? "");
    const reason = String(body?.reason ?? "").trim();
    const detail = typeof body?.detail === "string" ? body.detail.trim().slice(0, 2000) : null;
    const images = Array.isArray(body?.images) ? body.images.slice(0, 5).map((s: unknown) => String(s)) : [];

    if (!orderId) return NextResponse.json({ error: "orderId_required" }, { status: 400 });
    if (reason.length < 3) return NextResponse.json({ error: "reason_short" }, { status: 400 });

    const order = await prisma.bnOrder.findUnique({
        where: { id: orderId },
        include: { shop: { select: { profileId: true, name: true } } },
    });
    if (!order || order.buyerId !== auth.profileId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    // Faqat COMPLETED yoki READY buyurtmani qaytarish mumkin (14 kun ichida)
    if (!["COMPLETED", "READY"].includes(order.status)) {
        return NextResponse.json({ error: "invalid_state", currentStatus: order.status }, { status: 409 });
    }
    const completedAt = order.completedAt ?? order.readyAt ?? order.placedAt;
    const days = (Date.now() - completedAt.getTime()) / 86400_000;
    if (days > 14) {
        return NextResponse.json({ error: "expired", daysAgo: Math.floor(days) }, { status: 410 });
    }
    // Bir buyurtmaga faqat bitta aktiv so'rov
    const existing = await prisma.bnReturn.findFirst({
        where: { orderId, status: { in: ["REQUESTED", "APPROVED"] } },
    });
    if (existing) {
        return NextResponse.json({ error: "already_requested", returnId: existing.id }, { status: 409 });
    }

    const ret = await prisma.bnReturn.create({
        data: {
            orderId,
            buyerId: auth.profileId,
            reason, detail, images,
        },
    });

    // Sotuvchiga bildirishnoma
    after(async () => {
        if (order.shop?.profileId) {
            await bnNotify({
                profileId: order.shop.profileId,
                type: "RETURN_REQUESTED",
                title: "Qaytarish so'rovi",
                body: `${order.code} — ${reason}`,
                link: "/kabinet",
            });
        }
    });

    return NextResponse.json({ ok: true, return: ret });
}

export async function GET(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const shopMode = searchParams.get("shop") === "1";

    if (shopMode) {
        // Sotuvchi — o'z do'konining orderlariga so'rovlar
        const shop = await prisma.bnShop.findFirst({
            where: { profileId: auth.profileId, status: "APPROVED" },
            select: { id: true },
        });
        if (!shop) return NextResponse.json({ items: [] });
        const orders = await prisma.bnOrder.findMany({
            where: { shopId: shop.id },
            select: { id: true },
        });
        const returns = await prisma.bnReturn.findMany({
            where: { orderId: { in: orders.map(o => o.id) } },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return NextResponse.json({ items: returns });
    }

    // Xaridor — o'z so'rovlari
    const items = await prisma.bnReturn.findMany({
        where: { buyerId: auth.profileId },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    return NextResponse.json({ items });
}
