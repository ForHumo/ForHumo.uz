import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBelisOrderCode, calcBelisDeliveryFee } from "@/lib/belis-order";
import { belisNotifyAdmin } from "@/lib/belis-bot";
import type { BelisFulfillType, BelisPayMethod } from "@prisma/client";

const VALID_FULFILL: BelisFulfillType[] = ["YANDEX_DELIVERY", "BTS_EXPRESS", "PICKUP"];
const VALID_PAY: BelisPayMethod[] = ["CARD", "CASH", "TELEGRAM_INVOICE"];

// GET /api/belis/orders — mening buyurtmalarim
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ items: [] });
    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ items: [] });
    const items = await prisma.belisOrder.findMany({
        where: { buyerId: me.id },
        orderBy: { createdAt: "desc" }, take: 50,
        include: { items: true },
    });
    return NextResponse.json({ items });
}

// POST /api/belis/orders — buyurtma yaratish
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    const me = email ? await prisma.userProfile.findUnique({ where: { email }, select: { id: true, name: true } }) : null;

    const body = await req.json().catch(() => ({}));
    const {
        items, buyerName, buyerPhone, address, city, fulfillType, paymentMethod, note, telegramUserId,
    } = body as {
        items?: Array<{ productId: string; quantity: number }>;
        buyerName?: string; buyerPhone?: string; address?: string; city?: string;
        fulfillType?: BelisFulfillType; paymentMethod?: BelisPayMethod;
        note?: string; telegramUserId?: string;
    };

    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "Buyurtma bo'sh" }, { status: 400 });
    if (!buyerName?.trim() || !buyerPhone?.trim()) return NextResponse.json({ error: "Ism va telefon kerak" }, { status: 400 });
    if (!fulfillType || !VALID_FULFILL.includes(fulfillType)) return NextResponse.json({ error: "Yetkazish usuli noto'g'ri" }, { status: 400 });
    if (!paymentMethod || !VALID_PAY.includes(paymentMethod)) return NextResponse.json({ error: "To'lov usuli noto'g'ri" }, { status: 400 });
    // NAQD faqat PICKUP bilan
    if (paymentMethod === "CASH" && fulfillType !== "PICKUP") {
        return NextResponse.json({ error: "Naqd to'lov faqat 'O'zi olib ketish' bilan mumkin" }, { status: 400 });
    }
    if (fulfillType !== "PICKUP" && !address?.trim()) {
        return NextResponse.json({ error: "Yetkazish uchun manzil kerak" }, { status: 400 });
    }

    // Mahsulotlar snapshot
    const productIds = [...new Set(items.map(i => i.productId))];
    const products = await prisma.belisProduct.findMany({
        where: { id: { in: productIds }, isActive: true, hidden: false },
    });
    if (products.length === 0) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 400 });

    const orderItems = items.map(it => {
        const p = products.find(x => x.id === it.productId);
        if (!p) return null;
        const q = Math.max(1, Math.min(99, Math.floor(it.quantity || 1)));
        return {
            productId: p.id,
            productName: p.nameUz,
            productImage: p.images[0] ?? null,
            quantity: q,
            priceSnapshot: p.price,
            currency: p.currency,
            subtotal: Number(p.price) * q,
        };
    }).filter((x): x is NonNullable<typeof x> => !!x);

    const subtotal = orderItems.reduce((s, x) => s + x.subtotal, 0);
    const deliveryFee = calcBelisDeliveryFee(fulfillType, subtotal);
    const total = subtotal + deliveryFee;
    const currency = orderItems[0]?.currency ?? "UZS";
    const code = await generateBelisOrderCode();

    const order = await prisma.belisOrder.create({
        data: {
            code,
            buyerId: me?.id ?? null,
            telegramUserId: telegramUserId ?? null,
            buyerName: buyerName.trim().slice(0, 80),
            buyerPhone: buyerPhone.trim().slice(0, 20),
            address: address?.trim().slice(0, 300) ?? null,
            city: city?.trim().slice(0, 60) ?? null,
            fulfillType,
            paymentMethod,
            paymentStatus: "PENDING",
            subtotal, deliveryFee, total, currency,
            note: note?.trim().slice(0, 500) ?? null,
            items: {
                create: orderItems.map(x => ({
                    productId: x.productId, productName: x.productName, productImage: x.productImage,
                    quantity: x.quantity, priceSnapshot: x.priceSnapshot, currency: x.currency,
                })),
            },
        },
        include: { items: true },
    });

    // Savatni tozalash (agar login qilingan bo'lsa)
    if (me) {
        await prisma.belisCartItem.deleteMany({
            where: { profileId: me.id, productId: { in: productIds } },
        }).catch(() => {});
    }

    // Admin bot bildirishnoma
    after(async () => {
        const lines = [
            `<b>YANGI BUYURTMA</b> ${order.code}`,
            `👤 ${order.buyerName} · ${order.buyerPhone}`,
            `📦 ${order.items.length} ta mahsulot · ${total.toLocaleString("uz-UZ")} ${currency}`,
            `🚚 ${fulfillType} · 💳 ${paymentMethod}`,
            address ? `📍 ${address}` : "🏠 Pickup",
            note ? `\n📝 ${note}` : "",
        ].filter(Boolean).join("\n");
        await belisNotifyAdmin(lines);
    });

    return NextResponse.json({ order });
}
