import type { Metadata } from "next";
import { BnCartClient, type CartItem } from "@/components/bn/bn-cart-client";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Savat", robots: { index: false, follow: false } };

export default async function Page() {
    const auth = await getBnAuth();
    if (!auth) return <BnCartClient initial={[]} unauthenticated />;

    const rawItems = await prisma.bnCartItem.findMany({
        where: { profileId: auth.profileId },
        orderBy: { createdAt: "desc" },
    });
    const productIds = rawItems.map(i => i.productId);
    const products = productIds.length ? await prisma.bnProduct.findMany({
        where: { id: { in: productIds } },
        include: {
            shop: { select: { slug: true, name: true, city: true, market: { select: { name: true } } } },
        },
    }) : [];
    const byId = new Map(products.map(p => [p.id, p]));

    const initial: CartItem[] = rawItems
        .map(i => {
            const p = byId.get(i.productId);
            if (!p) return null;
            return {
                id: i.id,
                qty: i.qty,
                product: {
                    id: p.id,
                    slug: p.slug,
                    title: p.title,
                    price: p.price,
                    marketAvgPrice: p.marketAvgPrice,
                    images: p.images,
                    stock: p.stock,
                    allowDelivery: p.allowDelivery,
                    allowInspect: p.allowInspect,
                    shopSlug: p.shop?.slug ?? "",
                    shopName: p.shop?.name ?? "",
                    marketName: p.shop?.market?.name ?? null,
                    city: p.shop?.city ?? "Toshkent",
                },
            };
        })
        .filter((x): x is CartItem => x !== null);

    return <BnCartClient initial={initial} unauthenticated={false} />;
}
