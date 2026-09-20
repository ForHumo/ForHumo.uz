// Sotuvchi HOLD kodini kiritib mahsulotni sotadi. Buyurtma yaratiladi.
// Faqat do'kon egasi (BnShop.profileId) yoki BN OWNER admin.
//
// POST /api/bn/inspect/[code]/confirm
//   body: { phone?: string }   xaridor telefonini yozib qo'yish (do'konga aytadi)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBnAuth } from "@/lib/bn-auth";

function genOrderCode(): string {
    const t = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `BN-${t}-${r}`;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ code: string }> },
) {
    const auth = await requireBnAuth();
    if (auth instanceof NextResponse) return auth;
    const { code } = await params;

    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone ?? "").trim() || "—";

    const hold = await prisma.bnInspectHold.findUnique({ where: { code } });
    if (!hold) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (hold.usedAt) return NextResponse.json({ error: "already_used" }, { status: 409 });
    if (hold.cancelledAt) return NextResponse.json({ error: "cancelled" }, { status: 409 });
    if (hold.expiresAt < new Date()) return NextResponse.json({ error: "expired" }, { status: 409 });

    const product = await prisma.bnProduct.findUnique({
        where: { id: hold.productId },
        include: { shop: { select: { id: true, profileId: true } } },
    });
    if (!product) return NextResponse.json({ error: "product_missing" }, { status: 404 });

    // Ruxsat
    const isSeller = product.shop?.profileId === auth.profileId;
    let isAdmin = false;
    if (!isSeller) {
        const admin = await prisma.bnAdmin.findUnique({
            where: { profileId: auth.profileId }, select: { role: true },
        });
        isAdmin = admin?.role === "OWNER" || admin?.role === "MODERATOR";
    }
    if (!isSeller && !isAdmin) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const total = product.price * hold.qty;
    const orderCode = genOrderCode();
    let created: { code: string; id: string } | null = null;

    try {
        await prisma.$transaction(async (tx) => {
            // Atomik: holdni "used" deb egallash — faqat hali ochiq VA muddati o'tmagan
            // bo'lsa. Aks holda (bir vaqtda bekor / expiry) sotuv + stok tiklash birga
            // bo'lib, inventar buzilardi. G'olib faqat bittasi.
            const claim = await tx.bnInspectHold.updateMany({
                where: { id: hold.id, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } },
                data:  { usedAt: new Date() },
            });
            if (claim.count === 0) throw new Error("HOLD_CLOSED");

            const order = await tx.bnOrder.create({
                data: {
                    code: orderCode,
                    buyerId: hold.profileId,
                    shopId: product.shop!.id,
                    subtotal: total,
                    deliveryFee: 0,
                    commission: 0,
                    total,
                    fulfillType: "INSPECT",
                    phone,
                    paymentMethod: "CASH",
                    paymentStatus: "PAID",   // naqd bo'ldi, do'konda
                    escrowHeld: false,
                    status: "COMPLETED",
                    completedAt: new Date(),
                    items: {
                        create: [{
                            productId: product.id,
                            title: product.title,
                            price: product.price,
                            qty: hold.qty,
                            imageUrl: product.images?.[0] ?? null,
                        }],
                    },
                },
            });
            created = { code: order.code, id: order.id };

            await tx.bnProduct.update({
                where: { id: product.id },
                data:  { sold: { increment: hold.qty } },
            });
            // usedAt yuqorida atomik claim'да o'rnatildi (bu yerda takror shart emas)
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "HOLD_CLOSED") {
            return NextResponse.json({ error: "hold_closed" }, { status: 409 });
        }
        return NextResponse.json({ error: "confirm_failed", detail: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order: created });
}
