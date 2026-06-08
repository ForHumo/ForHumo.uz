import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/market/orders/seller — sotuvchining mahsulotlari bor buyurtmalar
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ orders: [] });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ orders: [] });

    const raw = await prisma.marketOrder.findMany({
        where: { items: { some: { product: { brand: { ownerId: profile.id } } } } },
        include: {
            items: {
                include: { product: { select: { name: true, slug: true, images: true, brand: { select: { name: true, ownerId: true } } } } },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    // Xaridor ismlari
    const buyerIds = [...new Set(raw.map(o => o.profileId))];
    const buyers = await prisma.userProfile.findMany({
        where: { id: { in: buyerIds } },
        select: { id: true, name: true, username: true },
    });
    const bMap = Object.fromEntries(buyers.map(b => [b.id, b]));

    // Faqat sotuvchining mahsulotlarini qoldiramiz + sotuvchi summasi
    const orders = raw.map(o => {
        const mine = o.items.filter(it => it.product.brand.ownerId === profile.id);
        const sellerTotal = mine.reduce((s, it) => s + Number(it.price) * it.quantity, 0);
        return {
            id: o.id, status: o.status, createdAt: o.createdAt, address: o.address,
            paymentMethod: o.paymentMethod,
            buyer: bMap[o.profileId] ?? null,
            items: mine.map(it => ({ quantity: it.quantity, price: it.price, variantName: it.variantName, product: it.product })),
            sellerTotal,
        };
    });

    return NextResponse.json({ orders });
}
