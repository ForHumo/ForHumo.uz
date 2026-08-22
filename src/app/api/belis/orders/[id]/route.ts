import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireBelisAdmin } from "@/lib/belis";
import { belisBotSend } from "@/lib/belis-bot";
import type { BelisOrderStatus, BelisPayStatus } from "@prisma/client";

const VALID_STATUS: BelisOrderStatus[] = ["NEW", "ACCEPTED", "PREPARING", "SHIPPING", "DELIVERED", "CANCELLED"];
const VALID_PAY_STATUS: BelisPayStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED"];

// GET /api/belis/orders/[id] — buyurtma detali (buyer o'zi yoki admin)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    const order = await prisma.belisOrder.findUnique({
        where: { id }, include: { items: true },
    });
    if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    // Ruxsat: order egasi (buyerId) yoki Belis admin
    let allowed = false;
    if (email) {
        const me = await prisma.userProfile.findUnique({ where: { email }, select: { id: true, username: true } });
        if (me?.id && order.buyerId === me.id) allowed = true;
        if (me?.username && ["sevinch", "abduvoris"].includes(me.username.toLowerCase())) allowed = true;
    }
    if (!allowed) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    return NextResponse.json({ order });
}

// PATCH /api/belis/orders/[id] (admin) — status/paymentStatus/adminNote o'zgartirish
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const gate = await requireBelisAdmin(session?.user?.email);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    const now = new Date();

    if (typeof body.status === "string" && VALID_STATUS.includes(body.status)) {
        data.status = body.status;
        if (body.status === "ACCEPTED") data.acceptedAt = now;
        if (body.status === "PREPARING") data.preparingAt = now;
        if (body.status === "SHIPPING") data.shippedAt = now;
        if (body.status === "DELIVERED") data.deliveredAt = now;
        if (body.status === "CANCELLED") {
            data.cancelledAt = now;
            if (typeof body.cancelReason === "string") data.cancelReason = body.cancelReason.slice(0, 300);
        }
    }
    if (typeof body.paymentStatus === "string" && VALID_PAY_STATUS.includes(body.paymentStatus)) {
        data.paymentStatus = body.paymentStatus;
    }
    if (typeof body.adminNote === "string") data.adminNote = body.adminNote.slice(0, 500);

    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, noChanges: true });
    const order = await prisma.belisOrder.update({ where: { id }, data });

    // Foydalanuvchi Telegram bo'lsa xabar yuboramiz
    if (order.telegramChatId && data.status) {
        const label = {
            ACCEPTED: "✅ Qabul qilindi", PREPARING: "🎁 Tayyorlanmoqda",
            SHIPPING: "🚚 Yo'lda", DELIVERED: "🌿 Yetkazildi",
            CANCELLED: "❌ Bekor qilindi", NEW: "🆕 Yangi",
        }[order.status] ?? order.status;
        void belisBotSend(order.telegramChatId, `<b>${order.code}</b> · ${label}`);
    }

    return NextResponse.json({ order });
}
