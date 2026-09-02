// BN One-click sotib olish (express).
// Foydalanuvchining saqlangan default manzili + WALLET default payment orqali
// bir bosishda buyurtma yaratish. Fallback: default yo'q bo'lsa 400 + "no_default_address".
//
// POST { productId, variantId?, qty }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { getOrCreateWalletTx } from "@/lib/wallet";
import { BN_COMMISSION, orderRef } from "@/lib/bn-settle";
import { bnNotify } from "@/lib/bn-notify";

// BN buyurtma kod generator
function nextOrderCode(): string {
    const y = new Date().getFullYear();
    return `BN-${y}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const productId = String(body?.productId ?? "").trim();
    const variantId = body?.variantId ? String(body.variantId).trim() : null;
    const qty = Math.max(1, Math.min(999, Math.floor(Number(body?.qty) || 1)));
    if (!productId) return NextResponse.json({ error: "invalid_product" }, { status: 400 });

    // Default manzil
    const addr = await prisma.bnAddress.findFirst({
        where: { profileId: auth.profileId, isDefault: true },
        select: { id: true, phone: true, address: true, label: true },
    });
    // Telefon UserProfile'da bo'lishi mumkin
    const profile = await prisma.userProfile.findUnique({
        where: { id: auth.profileId },
        select: { phone: true },
    });
    const phone = addr?.phone || profile?.phone || "";
    if (!phone) return NextResponse.json({ error: "no_phone" }, { status: 400 });

    const product = await prisma.bnProduct.findUnique({
        where: { id: productId },
        select: {
            id: true, title: true, price: true, stock: true, isActive: true, hidden: true,
            images: true, allowPickup: true, allowDelivery: true, allowInspect: true,
            shopId: true,
        },
    });
    if (!product || !product.isActive || product.hidden) {
        return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
    }
    if (product.stock < qty) return NextResponse.json({ error: "out_of_stock" }, { status: 409 });

    let variantPrice: number | null = null;
    let variantName: string | null = null;
    if (variantId) {
        const variant = await prisma.bnProductVariant.findUnique({
            where: { id: variantId },
            select: { id: true, price: true, stock: true, name: true, productId: true },
        });
        if (!variant || variant.productId !== product.id) {
            return NextResponse.json({ error: "invalid_variant" }, { status: 400 });
        }
        if (variant.stock < qty) return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
        variantPrice = variant.price;
        variantName = variant.name;
    }

    const unitPrice = variantPrice ?? product.price;
    const subtotal = unitPrice * qty;
    const fulfillType = product.allowPickup ? "PICKUP" : product.allowInspect ? "INSPECT" : "DELIVERY";
    const deliveryFee = fulfillType === "DELIVERY" ? 20000 : 0;
    const total = subtotal + deliveryFee;
    const commission = Math.round(total * BN_COMMISSION);

    // Wallet balansini tekshirish + hold (escrow)
    try {
        const order = await prisma.$transaction(async (tx) => {
            const wallet = await getOrCreateWalletTx(tx, auth.profileId);
            if (Number(wallet.balance) < total) throw new Error("insufficient_balance");

            // Atomik stok kamaytirish
            const dec = await tx.bnProduct.updateMany({
                where: { id: product.id, stock: { gte: qty } },
                data:  { stock: { decrement: qty }, sold: { increment: qty } },
            });
            if (dec.count === 0) throw new Error("out_of_stock");

            if (variantId) {
                await tx.bnProductVariant.updateMany({
                    where: { id: variantId, stock: { gte: qty } },
                    data:  { stock: { decrement: qty } },
                });
            }

            const newBal = Number(wallet.balance) - total;
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });

            const code = nextOrderCode();
            const created = await tx.bnOrder.create({
                data: {
                    code,
                    buyerId: auth.profileId,
                    shopId: product.shopId,
                    subtotal,
                    deliveryFee,
                    commission,
                    total,
                    fulfillType,
                    address: addr?.address || null,
                    phone,
                    paymentMethod: "WALLET",
                    paymentStatus: "HELD",
                    escrowHeld: true,
                    status: "PLACED",
                    items: {
                        create: [{
                            productId: product.id,
                            variantId,
                            variantName,
                            title: product.title,
                            price: unitPrice,
                            qty,
                            imageUrl: product.images[0] || null,
                        }],
                    },
                },
                select: { id: true, code: true },
            });

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "PURCHASE",
                    amount: total,
                    currency: wallet.currency,
                    balanceAfter: newBal,
                    description: `BN ekspress buyurtma #${created.code}`,
                    ref: orderRef("hold", created.id),
                },
            });

            return created;
        });

        // Sotuvchini xabardor qilish
        const shop = await prisma.bnShop.findUnique({
            where: { id: product.shopId },
            select: { profileId: true, name: true },
        });
        if (shop?.profileId) {
            void bnNotify({
                profileId: shop.profileId,
                type: "ORDER_PLACED",
                title: `Yangi buyurtma #${order.code}`,
                body: `${qty} × ${product.title}`,
                link: `/kabinet/sotuvchi/buyurtma/${order.id}`,
            }).catch(() => null);
        }

        return NextResponse.json({ ok: true, orderId: order.id, orderCode: order.code });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("insufficient_balance")) return NextResponse.json({ error: "insufficient_balance" }, { status: 402 });
        if (msg.includes("out_of_stock")) return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
        return NextResponse.json({ error: "failed", detail: msg }, { status: 500 });
    }
}
