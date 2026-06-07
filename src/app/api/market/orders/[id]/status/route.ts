import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/market-notify";

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
        include: { items: { select: { product: { select: { brand: { select: { ownerId: true } } } } } } },
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

    await prisma.marketOrder.update({ where: { id }, data: { status } });

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

    return NextResponse.json({ ok: true, status });
}
