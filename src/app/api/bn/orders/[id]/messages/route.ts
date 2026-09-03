// Buyurtma ichida xaridor↔sotuvchi yozishuv (K2).
//
// GET  /api/bn/orders/[id]/messages         — xabarlar ro'yxati + o'qildi belgilash (avto)
// POST /api/bn/orders/[id]/messages         — yangi xabar { text, imageUrl? }
//
// Faqat buyer YOKI shop egasi ko'ra/yoza oladi.
// Yangi xabar → qarshi tomonga push notification (fail-safe).

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { bnNotify } from "@/lib/bn-notify";

export const dynamic = "force-dynamic";

async function getOrderContext(orderId: string, myId: string) {
    const order = await prisma.bnOrder.findUnique({
        where: { id: orderId },
        include: { shop: { select: { profileId: true, name: true, slug: true } } },
    });
    if (!order) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
    const isBuyer = order.buyerId === myId;
    const isSeller = order.shop?.profileId === myId;
    if (!isBuyer && !isSeller) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    return { order, isBuyer, isSeller };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const ctx = await getOrderContext(id, auth.profileId);
    if ("error" in ctx) return ctx.error;

    const messages = await prisma.bnOrderMessage.findMany({
        where: { orderId: id },
        orderBy: { createdAt: "asc" },
        take: 200,
    });

    // Qarshi tomon xabarlarini o'qilgan deb belgilash
    const unreadFromOther = messages.filter(m => m.senderId !== auth.profileId && !m.readAt).map(m => m.id);
    if (unreadFromOther.length > 0) {
        await prisma.bnOrderMessage.updateMany({
            where: { id: { in: unreadFromOther } },
            data: { readAt: new Date() },
        });
    }

    return NextResponse.json({
        messages: messages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            isMine: m.senderId === auth.profileId,
            text: m.text,
            imageUrl: m.imageUrl,
            readAt: m.readAt?.toISOString() ?? null,
            createdAt: m.createdAt.toISOString(),
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const ctx = await getOrderContext(id, auth.profileId);
    if ("error" in ctx) return ctx.error;

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, 2000);
    const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.length > 0
        ? body.imageUrl.slice(0, 500)
        : null;

    if (!text && !imageUrl) {
        return NextResponse.json({ error: "empty" }, { status: 400 });
    }

    const msg = await prisma.bnOrderMessage.create({
        data: {
            orderId: id,
            senderId: auth.profileId,
            text,
            imageUrl,
        },
    });

    // Qarshi tomonga push (fail-safe)
    after(async () => {
        const recipientId = ctx.isBuyer ? ctx.order.shop!.profileId : ctx.order.buyerId;
        const shortText = text.length > 60 ? text.slice(0, 57) + "…" : text;
        const senderLabel = ctx.isBuyer ? "Xaridor" : ctx.order.shop!.name;
        await bnNotify({
            profileId: recipientId,
            type: "ORDER_MESSAGE",
            title: `${senderLabel}: ${ctx.order.code}`,
            body: shortText || "Rasm yubordi",
            link: `/buyurtmalarim/${ctx.order.code}?chat=1`,
        });
    });

    return NextResponse.json({
        ok: true,
        message: {
            id: msg.id,
            senderId: msg.senderId,
            isMine: true,
            text: msg.text,
            imageUrl: msg.imageUrl,
            readAt: null,
            createdAt: msg.createdAt.toISOString(),
        },
    });
}
