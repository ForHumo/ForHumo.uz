import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { notify } from "@/lib/market-notify";
import { settleOrder } from "@/lib/market-settle";
import { sendSms } from "@/lib/sms";

type Status = "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const LABEL: Record<string, string> = {
    PROCESSING: "tayyorlanmoqda", SHIPPED: "yo'lda", DELIVERED: "yetkazildi", CANCELLED: "bekor qilindi",
};

// POST /api/market/orders/[id]/status — sotuvchi yoki xaridor holatni o'zgartiradi
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status } = await req.json() as { status: Status };

    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const order = await prisma.marketOrder.findUnique({
        where: { id },
        include: { items: { select: { productId: true, variantId: true, quantity: true, product: { select: { brand: { select: { ownerId: true } } } } } } },
    });
    if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });

    const isBuyer = order.profileId === profile.id;
    const isSeller = order.items.some(it => it.product.brand.ownerId === profile.id);

    // Ruxsat etilgan o'tishlar
    const sellerCan = isSeller && (status === "PROCESSING" || status === "SHIPPED" || status === "CANCELLED");
    const buyerCanCancel = isBuyer && status === "CANCELLED" && ["PENDING", "PAID", "PROCESSING"].includes(order.status);
    const buyerCanReceive = isBuyer && status === "DELIVERED" && order.status === "SHIPPED";

    if (!sellerCan && !buyerCanCancel && !buyerCanReceive)
        return NextResponse.json({ error: "Bu amalga ruxsat yo'q" }, { status: 403 });

    if (status === "CANCELLED" && order.status !== "CANCELLED" && order.status !== "DELIVERED") {
        // Bekor qilish: status + stock tiklash + sold kamaytirish + (ZIJ bo'lsa) Zij qaytarish — atomik
        const ops: Prisma.PrismaPromise<unknown>[] = [
            prisma.marketOrder.update({ where: { id }, data: { status: "CANCELLED" } }),
        ];
        for (const it of order.items) {
            ops.push(prisma.marketProduct.update({ where: { id: it.productId }, data: { sold: { decrement: it.quantity } } }));
            if (it.variantId) ops.push(prisma.marketProductVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } }));
            else ops.push(prisma.marketProduct.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } }));
        }
        if (order.paymentMethod === "WALLET" && Number(order.total) > 0) {
            let wallet = await prisma.wallet.findUnique({ where: { profileId: order.profileId } });
            if (!wallet) wallet = await prisma.wallet.create({ data: { profileId: order.profileId } });
            const newBalance = Number(wallet.balance) + Number(order.total);
            ops.push(prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }));
            ops.push(prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id, type: "REFUND", amount: Number(order.total), balanceAfter: newBalance,
                    description: `Buyurtma bekor qilindi — qaytarildi`, ref: order.id,
                },
            }));
        }
        await prisma.$transaction(ops);
    } else {
        await prisma.marketOrder.update({ where: { id }, data: { status } });
        // Yetkazildi → sotuvchilarga to'lov
        if (status === "DELIVERED") await settleOrder(id);
    }

    // Bildirishnoma
    const short = `#${order.id.slice(-8).toUpperCase()}`;
    if (isSeller && !isBuyer) {
        // Sotuvchi o'zgartirdi → xaridorga
        await notify(order.profileId, {
            type: status === "DELIVERED" ? "ORDER_DELIVERED" : "ORDER_UPDATE",
            title: `Buyurtmangiz ${LABEL[status] ?? status}`,
            body: short,
            link: `/market/orders`,
        });
    } else if (isBuyer && status === "CANCELLED") {
        // Xaridor bekor qildi → sotuvchilarga
        const owners = [...new Set(order.items.map(it => it.product.brand.ownerId))].filter(o => o !== profile.id);
        for (const owner of owners) {
            await notify(owner, {
                type: "ORDER_UPDATE", title: "Buyurtma bekor qilindi", body: short, link: `/market/brand/manage`,
            });
        }
    }

    // SMS bildirishnoma xaridorga (status o'zgarganda) — fail-open, background
    if (isSeller && !isBuyer && ["SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
        after(async () => {
            try {
                const buyer = await prisma.userProfile.findUnique({
                    where: { id: order.profileId }, select: { phone: true },
                });
                if (buyer?.phone) {
                    await sendSms(buyer.phone, `ForHumo: Buyurtma ${short} — ${LABEL[status] ?? status}.`);
                }
            } catch { /* fail-open */ }
        });
    }

    return NextResponse.json({ ok: true, status });
}
