import type { Metadata } from "next";
import { BnFavoritesClient } from "@/components/bn/bn-favorites-client";
import { getBnAuth } from "@/lib/bn-auth";
import { prisma } from "@/lib/prisma";
import type { BnProductDTO } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sevimlilar", robots: { index: false, follow: false } };

export default async function Page() {
    const auth = await getBnAuth();
    if (!auth) return <BnFavoritesClient initial={[]} unauthenticated />;

    const favs = await prisma.bnFavorite.findMany({
        where: { profileId: auth.profileId },
        orderBy: { createdAt: "desc" },
    });
    const productIds = favs.map(f => f.productId);
    const products = productIds.length ? await prisma.bnProduct.findMany({
        where: { id: { in: productIds }, isActive: true, hidden: false },
        include: {
            shop: { select: { slug: true, name: true, tier: true, city: true, market: { select: { name: true } } } },
            category: { select: { slug: true } },
        },
    }) : [];

    const initial: BnProductDTO[] = products.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        price: p.price,
        oldPrice: p.oldPrice,
        marketAvgPrice: p.marketAvgPrice,
        images: p.images,
        categorySlug: p.category?.slug ?? "",
        shopSlug: p.shop?.slug ?? "",
        shopName: p.shop?.name ?? "",
        shopVerified: p.shop?.tier === "VERIFIED" || p.shop?.tier === "PREMIUM",
        marketName: p.shop?.market?.name ?? null,
        city: p.shop?.city ?? "Toshkent",
        district: null,
        branchName: null,
        stock: p.stock,
        isNegotiable: p.isNegotiable,
        allowPickup: p.allowPickup,
        allowDelivery: p.allowDelivery,
        allowInspect: p.allowInspect,
        rating: p.rating,
        ratingCount: p.ratingCount,
        attributes: (p.attributes as Record<string, string | number | boolean>) ?? {},
    }));

    return <BnFavoritesClient initial={initial} unauthenticated={false} />;
}
