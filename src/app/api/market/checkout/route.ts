import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PaymentMethod = "ZIJ" | "CASH_ON_DELIVERY" | "CARD_ON_DELIVERY";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { address, note, paymentMethod = "ZIJ" }: {
        address?: string; note?: string; paymentMethod?: PaymentMethod;
    } = await req.json();

    if (!address?.trim())
        return NextResponse.json({ error: "Yetkazib berish manzili majburiy" }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const cartItems = await prisma.marketCartItem.findMany({
        where: { profileId: profile.id },
        include: { product: true },
    });
    if (!cartItems.length) return NextResponse.json({ error: "Savat bo'sh" }, { status: 400 });

    for (const item of cartItems) {
        if (item.product.stock < item.quantity)
            return NextResponse.json({ error: `"${item.product.name}": yetarli stock yo'q` }, { status: 400 });
    }

    const total = cartItems.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

    // Zij to'lov uchun balans tekshirish
    if (paymentMethod === "ZIJ") {
        let wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } });
        if (!wallet) wallet = await prisma.zijWallet.create({ data: { profileId: profile.id } });
        if (Number(wallet.balance) < total) {
            return NextResponse.json({
                error: `Balans yetarli emas. Kerak: ${total} Ƶ, Mavjud: ${Number(wallet.balance).toFixed(2)} Ƶ`,
                code: "INSUFFICIENT_ZIJ", required: total, available: Number(wallet.balance),
            }, { status: 400 });
        }

        const newBalance = Number(wallet.balance) - total;
        const [order] = await prisma.$transaction([
            prisma.marketOrder.create({
                data: {
                    profileId: profile.id, total,
                    status: "PAID",
                    paymentMethod: "ZIJ",
                    address: address.trim(),
                    note: note?.trim() ?? null,
                    items: { create: cartItems.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.product.price })) },
                },
            }),
            prisma.zijWallet.update({ where: { id: wallet!.id }, data: { balance: newBalance } }),
            prisma.zijTransaction.create({
                data: {
                    walletId: wallet!.id, type: "PURCHASE", amount: total, balanceAfter: newBalance,
                    description: `Humo Market — ${cartItems.length} ta mahsulot`,
                },
            }),
            ...cartItems.map(i => prisma.marketProduct.update({
                where: { id: i.productId },
                data: { stock: { decrement: i.quantity }, sold: { increment: i.quantity } },
            })),
            prisma.marketCartItem.deleteMany({ where: { profileId: profile.id } }),
        ]);
        return NextResponse.json({ order, newBalance });
    }

    // Naqd / Karta (yetkazishda to'lash)
    const [order] = await prisma.$transaction([
        prisma.marketOrder.create({
            data: {
                profileId: profile.id, total,
                status: "PENDING",
                paymentMethod: paymentMethod as "CASH_ON_DELIVERY" | "CARD_ON_DELIVERY",
                address: address.trim(),
                note: note?.trim() ?? null,
                items: { create: cartItems.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.product.price })) },
            },
        }),
        ...cartItems.map(i => prisma.marketProduct.update({
            where: { id: i.productId },
            data: { stock: { decrement: i.quantity }, sold: { increment: i.quantity } },
        })),
        prisma.marketCartItem.deleteMany({ where: { profileId: profile.id } }),
    ]);
    return NextResponse.json({ order, newBalance: null });
}
