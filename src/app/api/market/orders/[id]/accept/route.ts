import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/market-notify";

// POST /api/market/orders/[id]/accept — xaridor buyurtmani qabul qildi
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } });
    if (!profile) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const order = await prisma.marketOrder.findUnique({
        where: { id },
        include: { items: { include: { product: { select: { slug: true, name: true, images: true } } } } },
    });
    if (!order || order.profileId !== profile.id)
        return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    if (order.status === "DELIVERED")
        return NextResponse.json({ error: "Allaqachon qabul qilingan" }, { status: 400 });

    await prisma.marketOrder.update({ where: { id }, data: { status: "DELIVERED" } });

    // Qabul qilindi bildirishnomasi
    await notify(profile.id, {
        type: "ORDER_ACCEPTED",
        title: "Buyurtmangizni qabul qildingiz",
        body: `#${order.id.slice(-8).toUpperCase()} — ${order.items.length} ta mahsulot`,
        link: `/market/orders`,
    });

    // Har bir mahsulotga sharh/baho eslatmasi
    for (const item of order.items) {
        await notify(profile.id, {
            type: "REVIEW_REMINDER",
            title: "Mahsulotga baho bering",
            body: `"${item.product.name}" — sharh va baho qoldiring`,
            link: `/market/product/${item.product.slug}`,
            image: item.product.images?.[0],
        });
    }

    return NextResponse.json({ ok: true, status: "DELIVERED" });
}
