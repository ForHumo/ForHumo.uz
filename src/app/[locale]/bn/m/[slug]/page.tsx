import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnMarketPage } from "@/components/bn/bn-pages";
import { getMarketBySlug } from "@/lib/bn-data";
import { prisma } from "@/lib/prisma";
import { BnBreadcrumbLd } from "@/components/bn/bn-jsonld";
import { BnMarketLd } from "@/components/bn/bn-market-ld";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

function localizedName(name: string, nameRu: string | null, locale: Locale): string {
    return locale === "ru" && nameRu ? nameRu : name;
}

function buildDescription(locale: Locale, name: string, city: string, district: string | null, shopCount: number, workHours: string | null, address: string | null): string {
    const loc = district ? `${district}, ${city}` : city;
    if (locale === "ru") {
        return `${name} — ${loc}. ${shopCount} магазинов${address ? ` · ${address}` : ""}${workHours ? ` · ${workHours}` : ""}. `
            + `Смотрите цены на все товары базара онлайн, сравнивайте магазины и заказывайте с защитой на Bozor Narxida.`;
    }
    if (locale === "en") {
        return `${name} — ${loc}. ${shopCount} shops${address ? ` · ${address}` : ""}${workHours ? ` · ${workHours}` : ""}. `
            + `Browse all bazaar prices online, compare shops and order with protection on Bozor Narxida.`;
    }
    return `${name} — ${loc}. ${shopCount} ta do'kon${address ? ` · ${address}` : ""}${workHours ? ` · ${workHours}` : ""}. `
        + `Bozor barcha mahsulotlari narxlarini onlayn ko'ring, do'konlarni solishtiring va Bozor Narxida'da eskrow himoyasi bilan buyurtma bering.`;
}

function buildTitle(locale: Locale, name: string, city: string): string {
    if (locale === "ru") return `${name} — цены онлайн (${city}) · Bozor Narxida`;
    if (locale === "en") return `${name} — online prices (${city}) · Bozor Narxida`;
    return `${name} — onlayn narxlar (${city}) · Bozor Narxida`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const m = await prisma.bnMarket.findUnique({
        where: { slug },
        select: {
            name: true, nameRu: true, description: true, city: true, district: true,
            address: true, workHours: true, shopCount: true,
        },
    });
    if (!m) return { title: slug.replace(/-/g, " ") };

    const name = localizedName(m.name, m.nameRu, locale);
    const title = buildTitle(locale, name, m.city);
    const description = m.description ?? buildDescription(locale, name, m.city, m.district, m.shopCount, m.workHours, m.address);

    const ogImage = `https://bozornarxida.uz/api/og/bn/market/${encodeURIComponent(slug)}`;
    const pageUrl = `https://bozornarxida.uz/m/${slug}`;

    return {
        title: { absolute: title },
        description,
        alternates: {
            canonical: pageUrl,
            languages: {
                "uz": `https://bozornarxida.uz/uz/m/${slug}`,
                "ru": `https://bozornarxida.uz/ru/m/${slug}`,
                "en": `https://bozornarxida.uz/en/m/${slug}`,
            },
        },
        openGraph: {
            type: "website",
            title,
            description,
            url: pageUrl,
            siteName: "Bozor Narxida",
            images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImage],
        },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
    const { locale, slug } = await params;
    const m = await getMarketBySlug(slug);
    if (!m) notFound();

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

    const displayName = localizedName(m.name, m.nameRu ?? null, locale);

    return (
        <>
            <BnMarketLd
                slug={m.slug}
                name={displayName}
                description={m.description ?? null}
                image={m.coverUrl}
                address={m.address}
                city={m.city}
                district={m.district ?? null}
                telephone={m.phone ?? null}
                latitude={m.lat}
                longitude={m.lng}
                workHours={m.workHours ?? null}
                shopCount={m.shopCount}
            />
            <BnBreadcrumbLd items={[
                { name: "Bosh sahifa", url: "/" },
                { name: "Bozorlar", url: "/bozorlar" },
                { name: displayName, url: `/m/${m.slug}` },
            ]} />
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
        </>
    );
}
