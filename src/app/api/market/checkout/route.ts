import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePromo } from "@/lib/market-promo";

type PaymentMethod = "ZIJ" | "CASH_ON_DELIVERY" | "CARD_ON_DELIVERY";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { address, note, paymentMethod = "ZIJ", promoCode }: {
        address?: string; note?: string; paymentMethod?: PaymentMethod; promoCode?: string;
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
    const subtotal = cartItems.reduce((s, i) => s + unitPrice(i) * i.quantity, 0);

    // Promokod (ixtiyoriy)
    let discount = 0;
    let appliedCode: string | null = null;
    let promoId: string | null = null;
    if (promoCode?.trim()) {
        const pr = await validatePromo(promoCode, subtotal);
        if (pr.error) return NextResponse.json({ error: pr.error }, { status: 400 });
        discount = pr.discount ?? 0;
        appliedCode = pr.code ?? null;
        promoId = pr.promoId ?? null;
    }
    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const orderItemsData = cartItems.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        variantName: i.variant?.name ?? null,
        quantity: i.quantity,
        price: unitPrice(i),
    }));

    // Zij to'lovida balansni oldindan tekshirish (do'stona xabar uchun)
    let walletId: string | null = null;
    if (paymentMethod === "ZIJ") {
        let wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } });
        if (!wallet) wallet = await prisma.zijWallet.create({ data: { profileId: profile.id } });
        if (Number(wallet.balance) < total) {
            return NextResponse.json({
                error: `Balans yetarli emas. Kerak: ${total} Ƶ, Mavjud: ${Number(wallet.balance).toFixed(2)} Ƶ`,
                code: "INSUFFICIENT_ZIJ", required: total, available: Number(wallet.balance),
            }, { status: 400 });
        }
        walletId = wallet.id;
    }

    // Interaktiv tranzaksiya — atomik stock kamaytirish (oversell oldini oladi)
    try {
        const result = await prisma.$transaction(async (tx) => {
            for (const i of cartItems) {
                if (i.variantId) {
                    const r = await tx.marketProductVariant.updateMany({
                        where: { id: i.variantId, stock: { gte: i.quantity } },
                        data: { stock: { decrement: i.quantity } },
                    });
                    if (r.count === 0) throw new Error(`"${i.product.name}": yetarli stock yo'q`);
                    await tx.marketProduct.update({ where: { id: i.productId }, data: { sold: { increment: i.quantity } } });
                } else {
                    const r = await tx.marketProduct.updateMany({
                        where: { id: i.productId, stock: { gte: i.quantity } },
                        data: { stock: { decrement: i.quantity }, sold: { increment: i.quantity } },
                    });
                    if (r.count === 0) throw new Error(`"${i.product.name}": yetarli stock yo'q`);
                }
            }

            let newBalance: number | null = null;
            if (paymentMethod === "ZIJ" && walletId) {
                const w = await tx.zijWallet.findUnique({ where: { id: walletId } });
                if (!w || Number(w.balance) < total) throw new Error("INSUFFICIENT_ZIJ");
                newBalance = Number(w.balance) - total;
                await tx.zijWallet.update({ where: { id: walletId }, data: { balance: newBalance } });
                await tx.zijTransaction.create({
                    data: { walletId, type: "PURCHASE", amount: total, balanceAfter: newBalance, description: `Humo Market — ${cartItems.length} ta mahsulot` },
                });
            }

            if (promoId) await tx.marketPromoCode.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });

            const order = await tx.marketOrder.create({
                data: {
                    profileId: profile.id, total, discount, promoCode: appliedCode,
                    status: paymentMethod === "ZIJ" ? "PAID" : "PENDING",
                    paymentMethod,
                    address: address.trim(),
                    note: note?.trim() ?? null,
                    items: { create: orderItemsData },
                },
            });

            await tx.marketCartItem.deleteMany({ where: { profileId: profile.id } });
            return { order, newBalance };
        });
        return NextResponse.json(result);
    } catch (e) {
        const msg = (e as Error).message;
        if (msg === "INSUFFICIENT_ZIJ") return NextResponse.json({ error: "Balans yetarli emas" }, { status: 400 });
        return NextResponse.json({ error: msg || "Xatolik yuz berdi" }, { status: 400 });
    }
}
