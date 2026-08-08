import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnMarketPage } from "@/components/bn/bn-pages";
import { getMarketBySlug } from "@/lib/bn-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const m = await prisma.bnMarket.findUnique({ where: { slug }, select: { name: true, address: true } });
    return {
        title: `${m?.name ?? slug.replace(/-/g, " ")}`,
        description: m ? `${m.name}${m.address ? ` — ${m.address}` : ""} — do'konlar va mahsulotlar ro'yxati.` : undefined,
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const m = await getMarketBySlug(slug);
    if (!m) notFound();

    // Do'konlarni DTO'ga aylantirish (getMarketBySlug ichki shape qaytaradi)
    const shops = m.shops.map(s => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        logoUrl: s.logoUrl,
        tier: s.tier,
        locationType: s.locationType,
        marketSlug: s.market?.slug ?? null,
        marketName: s.market?.name ?? null,
        marketSection: s.marketSection,
        marketShopNo: s.marketShopNo,
        address: s.address,
        city: s.city,
        district: null,
        branchName: null,
        rating: s.rating,
        ratingCount: s.ratingCount,
        productCount: s.productCount,
        lat: s.lat,
        lng: s.lng,
    }));

    // Shu bozordagi mahsulotlar (do'konlar orqali)
    const shopIds = m.shops.map(s => s.id);
    const productsRaw = shopIds.length > 0 ? await prisma.bnProduct.findMany({
        where: { shopId: { in: shopIds }, isActive: true, hidden: false },
        include: {
            shop: { select: { slug: true, name: true, tier: true, city: true, market: { select: { name: true } } } },
            category: { select: { slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
    }) : [];

    const products = productsRaw.map(p => ({
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

    return (
        <BnMarketPage
            market={{
                slug: m.slug,
                name: m.name,
                coverUrl: m.coverUrl ?? "",
                address: m.address ?? "",
                workHours: m.workHours ?? "",
                shopCount: m.shopCount,
                sections: m.sections,
                lat: m.lat,
                lng: m.lng,
            }}
            shops={shops}
            products={products}
        />
    );
}
