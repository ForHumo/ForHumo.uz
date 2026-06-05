import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/market/checkout — Zij bilan to'lov
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { address, note } = await req.json();

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Savatni olish
    const cartItems = await prisma.marketCartItem.findMany({
        where: { profileId: profile.id },
        include: { product: true },
    });
    if (!cartItems.length) return NextResponse.json({ error: "Savat bo'sh" }, { status: 400 });

    // Stock tekshirish
    for (const item of cartItems) {
        if (item.product.stock < item.quantity) {
            return NextResponse.json({
                error: `"${item.product.name}" uchun yetarli miqdor yo'q (mavjud: ${item.product.stock})`,
            }, { status: 400 });
        }
    }

    // Jami hisoblash
    const total = cartItems.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

    // Zij hamyon
    let wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } });
    if (!wallet) wallet = await prisma.zijWallet.create({ data: { profileId: profile.id } });
    if (Number(wallet.balance) < total) {
        return NextResponse.json({
            error: `Balans yetarli emas. Kerak: ${total} Ƶ, Mavjud: ${Number(wallet.balance).toFixed(2)} Ƶ`,
            code: "INSUFFICIENT_ZIJ",
            required: total,
            available: Number(wallet.balance),
        }, { status: 400 });
    }

    const newBalance = Number(wallet.balance) - total;

    // Atomic: buyurtma + Zij yechish + stock kamayish + savat tozalash
    const [order] = await prisma.$transaction([
        // Buyurtma yaratish
        prisma.marketOrder.create({
            data: {
                profileId: profile.id,
                total,
                status: "PAID",
                address: address ?? null,
                note: note ?? null,
                items: {
                    create: cartItems.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        price: i.product.price,
                    })),
                },
            },
        }),
        // Zij yechish
        prisma.zijWallet.update({ where: { id: wallet!.id }, data: { balance: newBalance } }),
        // Zij tranzaksiya
        prisma.zijTransaction.create({
            data: {
                walletId: wallet!.id,
                type: "PURCHASE",
                amount: total,
                balanceAfter: newBalance,
                description: `Humo Market — ${cartItems.length} ta mahsulot`,
            },
        }),
        // Stock kamayish + sold oshish
        ...cartItems.map(i => prisma.marketProduct.update({
            where: { id: i.productId },
            data: { stock: { decrement: i.quantity }, sold: { increment: i.quantity } },
        })),
        // Savatni tozalash
        prisma.marketCartItem.deleteMany({ where: { profileId: profile.id } }),
    ]);

    return NextResponse.json({ order, newBalance });
}
