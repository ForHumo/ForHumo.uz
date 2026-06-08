import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
        include: { product: true, variant: true },
    });
    if (!cartItems.length) return NextResponse.json({ error: "Savat bo'sh" }, { status: 400 });

    // Stock tekshiruvi (variant bo'lsa variant stock'i)
    for (const item of cartItems) {
        const avail = item.variant ? item.variant.stock : item.product.stock;
        if (avail < item.quantity)
            return NextResponse.json({ error: `"${item.product.name}": yetarli stock yo'q` }, { status: 400 });
    }

    // Narx variant bo'lsa variantdan
    const unitPrice = (i: typeof cartItems[number]) => Number(i.variant ? i.variant.price : i.product.price);
    const total = cartItems.reduce((s, i) => s + unitPrice(i) * i.quantity, 0);

    const orderItemsData = cartItems.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        variantName: i.variant?.name ?? null,
        quantity: i.quantity,
        price: unitPrice(i),
    }));

    // Stock kamaytirish: variant bo'lsa variant stock, bo'lmasa product stock; product.sold doim oshadi
    const stockOps: Prisma.PrismaPromise<unknown>[] = cartItems.flatMap(i => {
        const ops: Prisma.PrismaPromise<unknown>[] = [
            prisma.marketProduct.update({ where: { id: i.productId }, data: { sold: { increment: i.quantity } } }),
        ];
        if (i.variantId) {
            ops.push(prisma.marketProductVariant.update({ where: { id: i.variantId }, data: { stock: { decrement: i.quantity } } }));
        } else {
            ops.push(prisma.marketProduct.update({ where: { id: i.productId }, data: { stock: { decrement: i.quantity } } }));
        }
        return ops;
    });

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
                    items: { create: orderItemsData },
                },
            }),
            prisma.zijWallet.update({ where: { id: wallet!.id }, data: { balance: newBalance } }),
            prisma.zijTransaction.create({
                data: {
                    walletId: wallet!.id, type: "PURCHASE", amount: total, balanceAfter: newBalance,
                    description: `Humo Market — ${cartItems.length} ta mahsulot`,
                },
            }),
            ...stockOps,
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
                items: { create: orderItemsData },
            },
        }),
        ...stockOps,
        prisma.marketCartItem.deleteMany({ where: { profileId: profile.id } }),
    ]);
    return NextResponse.json({ order, newBalance: null });
}
