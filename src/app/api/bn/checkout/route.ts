// BN checkout — savat -> buyurtma(lar).
//
// POST /api/bn/checkout
//   body: {
//     fulfillType: "PICKUP" | "DELIVERY" | "INSPECT",
//     phone: string,
//     address?: string,        // DELIVERY uchun majburiy
//     note?: string,
//     paymentMethod: "WALLET" | "CASH",
//   }
//
//   1. Savatdagi barcha itemlarni oladi
//   2. Do'kon bo'yicha guruhlaydi
//   3. Har guruh uchun alohida BnOrder yaratadi (subtotal + delivery + commission)
//   4. Stokni atomik kamaytiradi (oversell guard)
//   5. WALLET bo'lsa — xaridor hamyoni ushlanadi (PURCHASE) va escrowHeld=true
//   6. Savatni tozalaydi
//   7. Barchasi bitta $transaction ichida — hech biri bajarilmasa hech biri o'zgarmaydi

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";
import { getOrCreateWalletTx } from "@/lib/wallet";
import { orderRef } from "@/lib/bn-settle";
import { trackBnEvent } from "@/lib/bn-events";
import { viewerCanSeeWholesale } from "@/lib/bn-data";
import { minQtyForProduct, parseTiers, priceForQty } from "@/lib/bn-wholesale";
import { bnNotify } from "@/lib/bn-notify";

const DELIVERY_FEE = 20_000;   // Toshkent — flat tarif (FAZA 6 da API bilan almashtiriladi)

function genOrderCode(): string {
    // BN-<epochsec36>-<rand4> — o'lchami kichkina, unique yetarli
    const t = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `BN-${t}-${r}`;
}

export async function POST(req: Request) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const fulfillType = String(body?.fulfillType ?? "PICKUP");
    const phone = String(body?.phone ?? "").trim();
    const address = String(body?.address ?? "").trim() || null;
    const note = String(body?.note ?? "").trim() || null;
    const paymentMethod = body?.paymentMethod === "WALLET" ? "WALLET" : "CASH";

    if (!["PICKUP", "DELIVERY", "INSPECT"].includes(fulfillType)) {
        return NextResponse.json({ error: "invalid_fulfill" }, { status: 400 });
    }
    if (phone.replace(/\D/g, "").length < 9) {
        return NextResponse.json({ error: "phone_required" }, { status: 400 });
    }
    if (fulfillType === "DELIVERY" && !address) {
        return NextResponse.json({ error: "address_required" }, { status: 400 });
    }

    // Savatni yig'ib olamiz (tranzaksiyadan tashqarida — o'qish yetarli)
    const cartItems = await prisma.bnCartItem.findMany({
        where: { profileId: auth.profileId },
        include: { variant: true },
    });
    if (cartItems.length === 0) {
        return NextResponse.json({ error: "cart_empty" }, { status: 400 });
    }

    const productIds = cartItems.map(i => i.productId);
    const products = await prisma.bnProduct.findMany({
        where: { id: { in: productIds } },
    });
    const byId = new Map(products.map(p => [p.id, p]));

    // Ulgurji tekshiruvi (kamida bitta ulgurji mahsulot bo'lsa)
    const hasWholesale = products.some(p => p.isWholesale);
    if (hasWholesale) {
        const canBuy = await viewerCanSeeWholesale(auth.profileId);
        if (!canBuy) {
            return NextResponse.json({ error: "wholesale_shop_required", message: "Ulgurji mahsulotni sotib olish uchun BN'da do'kon oching" }, { status: 403 });
        }
    }

    // Har item mavjud va aktivligini tekshirish + do'kon bo'yicha guruhlash
    // Ulgurji uchun narx dinamik — tier'ga qarab hisoblanadi.
    // Variant tanlangan bo'lsa variant narxi va zapasi.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups = new Map<string, { productId: string; variantId: string | null; variantName: string | null; qty: number; unitPrice: number; product: any }[]>();
    for (const it of cartItems) {
        const p = byId.get(it.productId);
        if (!p || !p.isActive || p.hidden) {
            return NextResponse.json({ error: "item_unavailable", productId: it.productId }, { status: 409 });
        }
        // Variant tanlangan bo'lsa variant zapasi va narxi
        const effectiveStock = it.variant?.stock ?? p.stock;
        if (effectiveStock < it.qty) {
            return NextResponse.json({ error: "insufficient_stock", productId: it.productId, available: effectiveStock }, { status: 409 });
        }
        let unitPrice = it.variant?.price ?? p.price;
        if (p.isWholesale) {
            const minQty = minQtyForProduct(true, p.minWholesaleQty);
            if (it.qty < minQty) {
                return NextResponse.json({ error: "wholesale_min_qty", productId: it.productId, minQty, message: `Kamida ${minQty} dona buyurtma qiling` }, { status: 400 });
            }
            unitPrice = priceForQty(unitPrice, parseTiers(p.wholesaleTiers), it.qty);
        }
        const key = p.shopId;
        const arr = groups.get(key) ?? [];
        arr.push({
            productId: it.productId,
            variantId: it.variantId,
            variantName: it.variant?.name ?? null,
            qty: it.qty, unitPrice, product: p,
        });
        groups.set(key, arr);
    }

    // WALLET bo'lsa — jami summani oldindan hisoblab, balansni tekshirish
    const totalAll = [...groups.values()].reduce((s, g) => {
        const sub = g.reduce((x, i) => x + i.unitPrice * i.qty, 0);
        const del = fulfillType === "DELIVERY" ? DELIVERY_FEE : 0;
        return s + sub + del;
    }, 0);

    if (paymentMethod === "WALLET") {
        const wallet = await prisma.wallet.findUnique({ where: { profileId: auth.profileId } });
        const bal = Number(wallet?.balance ?? 0);
        if (bal < totalAll) {
            return NextResponse.json({
                error: "insufficient_balance",
                need: totalAll,
                have: bal,
            }, { status: 402 });
        }
    }

    // ── Atomik: barcha orderlarni yaratamiz + stok kamaytiramiz + hamyon ushlaymiz + savatni tozalaymiz
    const createdCodes: string[] = [];
    try {
        await prisma.$transaction(async (tx) => {
            let walletBalance = 0;
            let walletId: string | null = null;
            let walletCurrency = "UZS";
            if (paymentMethod === "WALLET") {
                const w = await getOrCreateWalletTx(tx, auth.profileId);
                walletBalance = Number(w.balance);
                walletId = w.id;
                walletCurrency = w.currency;
            }

            for (const [shopId, items] of groups.entries()) {
                const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
                const deliveryFee = fulfillType === "DELIVERY" ? DELIVERY_FEE : 0;
                const total = subtotal + deliveryFee;
                const code = genOrderCode();

                const order = await tx.bnOrder.create({
                    data: {
                        code,
                        buyerId: auth.profileId,
                        shopId,
                        subtotal,
                        deliveryFee,
                        commission: 0,   // settle da hisoblanadi
                        total,
                        fulfillType: fulfillType as "PICKUP" | "DELIVERY" | "INSPECT",
                        address,
                        phone,
                        note,
                        paymentMethod: paymentMethod as "WALLET" | "CASH",
                        paymentStatus: paymentMethod === "WALLET" ? "HELD" : "PENDING",
                        escrowHeld: paymentMethod === "WALLET",
                        status: "PLACED",
                        items: {
                            create: items.map(i => ({
                                productId: i.productId,
                                variantId: i.variantId,
                                variantName: i.variantName,
                                title: i.product.title,
                                price: i.unitPrice,       // ulgurji tier yoki variant narxi
                                qty: i.qty,
                                imageUrl: i.product.images?.[0] ?? null,
                            })),
                        },
                    },
                });
                createdCodes.push(order.code);

                // Stokni atomik kamaytirish + oversell guard
                for (const i of items) {
                    if (i.variantId) {
                        // Variant zapasi
                        const upd = await tx.bnProductVariant.updateMany({
                            where: { id: i.variantId, stock: { gte: i.qty } },
                            data:  { stock: { decrement: i.qty } },
                        });
                        if (upd.count === 0) throw new Error(`OVERSELL:${i.productId}`);
                        // Mahsulot sold denorm
                        await tx.bnProduct.update({
                            where: { id: i.productId },
                            data: { sold: { increment: i.qty }, stock: { decrement: i.qty } },
                        }).catch(() => {});
                    } else {
                        const upd = await tx.bnProduct.updateMany({
                            where: { id: i.productId, stock: { gte: i.qty } },
                            data:  { stock: { decrement: i.qty }, sold: { increment: i.qty } },
                        });
                        if (upd.count === 0) throw new Error(`OVERSELL:${i.productId}`);
                    }
                }

                // WALLET — hamyondan yechib olamiz (escrow)
                if (paymentMethod === "WALLET" && walletId) {
                    walletBalance -= total;
                    await tx.wallet.update({
                        where: { id: walletId },
                        data:  { balance: walletBalance },
                    });
                    await tx.walletTransaction.create({
                        data: {
                            walletId,
                            type: "PURCHASE",
                            amount: total,
                            currency: walletCurrency,
                            balanceAfter: walletBalance,
                            description: `BN buyurtma #${order.code} (eskrow)`,
                            ref: orderRef("hold", order.id),
                        },
                    });
                }
            }

            // Savat tozalanadi
            await tx.bnCartItem.deleteMany({ where: { profileId: auth.profileId } });
        }, { timeout: 20_000 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.startsWith("OVERSELL:")) {
            const pid = msg.slice("OVERSELL:".length);
            return NextResponse.json({ error: "oversell", productId: pid }, { status: 409 });
        }
        return NextResponse.json({ error: "checkout_failed", detail: msg }, { status: 500 });
    }

    // Rekomendatsiya signali — PURCHASE (eng kuchli, weight 10)
    const purchasedIds = cartItems.map(i => i.productId);
    after(async () => {
        for (const pid of purchasedIds) {
            await trackBnEvent({ profileId: auth.profileId, productId: pid, type: "PURCHASE" });
        }
        // Sotuvchilarga "yangi buyurtma" bildirishnoma
        for (const [shopId] of groups.entries()) {
            const shopOwner = await prisma.bnShop.findUnique({
                where: { id: shopId }, select: { profileId: true, name: true },
            });
            if (shopOwner?.profileId) {
                await bnNotify({
                    profileId: shopOwner.profileId,
                    type: "ORDER_PLACED",
                    title: "Yangi buyurtma keldi",
                    body: `${shopOwner.name} do'koningizga yangi buyurtma`,
                    link: "/kabinet",
                });
            }
        }
    });

    return NextResponse.json({
        ok: true,
        orders: createdCodes,
        primary: createdCodes[0],
    });
}
