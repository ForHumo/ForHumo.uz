import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnOrderDetailClient, type OrderDetailDTO } from "@/components/bn/bn-orders-client";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
    const { code } = await params;
    return { title: `Buyurtma #${code} — Bozor Narxida`, robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const auth = await getBnAuth();
    if (!auth) notFound();

    const order = await prisma.bnOrder.findUnique({
        where: { code },
        include: {
            shop: { select: { slug: true, name: true, phone: true, city: true, market: { select: { name: true } } } },
            items: true,
        },
    });
    if (!order || order.buyerId !== auth.profileId) notFound();

    // Mahsulot slug'larini olib kelamiz (link uchun)
    const productIds = order.items.map(i => i.productId);
    const products = productIds.length ? await prisma.bnProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, slug: true },
    }) : [];
    const slugById = new Map(products.map(p => [p.id, p.slug]));

    const dto: OrderDetailDTO = {
        id: order.id,
        code: order.code,
        status: order.status,
        fulfillType: order.fulfillType,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        escrowHeld: order.escrowHeld,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        commission: order.commission,
        total: order.total,
        phone: order.phone,
        address: order.address,
        note: order.note,
        cancelReason: order.cancelReason,
        placedAt:    order.placedAt.toISOString(),
        confirmedAt: order.confirmedAt?.toISOString() ?? null,
        readyAt:     order.readyAt?.toISOString() ?? null,
        completedAt: order.completedAt?.toISOString() ?? null,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        shop: {
            slug: order.shop?.slug ?? "",
            name: order.shop?.name ?? "",
            phone: order.shop?.phone ?? null,
            marketName: order.shop?.market?.name ?? null,
            city: order.shop?.city ?? "Toshkent",
        },
        items: order.items.map(it => ({
            id: it.id,
            productId: it.productId,
            title: it.title,
            price: it.price,
            qty: it.qty,
            imageUrl: it.imageUrl,
            productSlug: slugById.get(it.productId) ?? null,
        })),
    };

    return <BnOrderDetailClient order={dto} />;
}
