import type { Metadata } from "next";
import { BnOrdersListClient, type OrderListItem } from "@/components/bn/bn-orders-client";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Buyurtmalarim — Bozor Narxida", robots: { index: false, follow: false } };

export default async function Page() {
    const auth = await getBnAuth();
    if (!auth) return <BnOrdersListClient initial={[]} unauthenticated />;

    const orders = await prisma.bnOrder.findMany({
        where: { buyerId: auth.profileId },
        orderBy: { placedAt: "desc" },
        take: 50,
        include: {
            shop:  { select: { name: true, slug: true } },
            items: { take: 1, select: { imageUrl: true } },
            _count: { select: { items: true } },
        },
    });

    const initial: OrderListItem[] = orders.map(o => ({
        id: o.id,
        code: o.code,
        status: o.status,
        fulfillType: o.fulfillType,
        paymentMethod: o.paymentMethod,
        total: o.total,
        placedAt: o.placedAt.toISOString(),
        shopName: o.shop?.name ?? "—",
        shopSlug: o.shop?.slug ?? "",
        itemCount: o._count.items,
        firstImage: o.items[0]?.imageUrl ?? null,
    }));

    return <BnOrdersListClient initial={initial} unauthenticated={false} />;
}
