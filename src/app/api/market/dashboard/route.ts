import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/market/dashboard — sotuvchi statistikasi
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const brands = await prisma.marketBrand.findMany({
        where: { ownerId: profile.id },
        select: { id: true, _count: { select: { products: true } } },
    });
    const brandCount = brands.length;
    const productCount = brands.reduce((s, b) => s + b._count.products, 0);

    // Sotuvchining mahsulotlaridagi buyurtma elementlari (bekor qilinmaganlar)
    const items = await prisma.marketOrderItem.findMany({
        where: {
            product: { brand: { ownerId: profile.id } },
            order: { status: { not: "CANCELLED" } },
        },
        select: {
            quantity: true, price: true, orderId: true,
            order: { select: { status: true, createdAt: true } },
            product: { select: { id: true, name: true, slug: true, images: true } },
        },
    });

    let revenue = 0, sold = 0;
    const orderIds = new Set<string>();
    const perProduct: Record<string, { name: string; slug: string; image: string | null; qty: number; revenue: number }> = {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const dt = new Date(today); dt.setDate(today.getDate() - i);
        days.push({ date: dt.toISOString().slice(0, 10), revenue: 0 });
    }

    for (const it of items) {
        const line = Number(it.price) * it.quantity;
        revenue += line; sold += it.quantity; orderIds.add(it.orderId);
        const p = perProduct[it.product.id] ??= { name: it.product.name, slug: it.product.slug, image: it.product.images?.[0] ?? null, qty: 0, revenue: 0 };
        p.qty += it.quantity; p.revenue += line;
        const key = new Date(it.order.createdAt).toISOString().slice(0, 10);
        const d = days.find(x => x.date === key);
        if (d) d.revenue += line;
    }

    const topProducts = Object.values(perProduct).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Faol buyurtmalar (e'tibor talab qiladiganlar)
    const pendingCount = await prisma.marketOrder.count({
        where: {
            status: { in: ["PENDING", "PAID", "PROCESSING"] },
            items: { some: { product: { brand: { ownerId: profile.id } } } },
        },
    });

    return NextResponse.json({
        stats: { revenue, sold, orders: orderIds.size, brandCount, productCount, pendingCount },
        topProducts,
        days,
    });
}
