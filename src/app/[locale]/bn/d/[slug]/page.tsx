import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnShopPage } from "@/components/bn/bn-pages";
import { getShopBySlug } from "@/lib/bn-data";
import { prisma } from "@/lib/prisma";
import { BnStoreLd, BnBreadcrumbLd } from "@/components/bn/bn-jsonld";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

function formatUZS(n: number, locale: Locale): string {
    const bcp = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-Latn-UZ";
    const num = n.toLocaleString(bcp, { maximumFractionDigits: 0 });
    return locale === "ru" ? `${num} сум` : locale === "en" ? `${num} UZS` : `${num} so'm`;
}

function buildTitle(locale: Locale, name: string, marketName: string | null, city: string): string {
    const loc = marketName ? `${marketName}, ${city}` : city;
    if (locale === "ru") return `${name} — ${loc} · Bozor Narxida`;
    if (locale === "en") return `${name} — ${loc} · Bozor Narxida`;
    return `${name} — ${loc} · Bozor Narxida`;
}

function buildDescription(locale: Locale, name: string, city: string, marketName: string | null, productCount: number, rating: number, ratingCount: number, priceLine: string | null): string {
    const ratingBit = ratingCount > 0 ? `★${rating.toFixed(1)} (${ratingCount})` : "";
    if (locale === "ru") {
        return `${name} — ${marketName ? `магазин на ${marketName}, ` : ""}${city}. ${productCount} товаров${ratingBit ? ` · ${ratingBit}` : ""}${priceLine ? ` · ${priceLine}` : ""}. Заказ с защитой эскроу на Bozor Narxida.`;
    }
    if (locale === "en") {
        return `${name} — ${marketName ? `shop at ${marketName}, ` : ""}${city}. ${productCount} items${ratingBit ? ` · ${ratingBit}` : ""}${priceLine ? ` · ${priceLine}` : ""}. Order with escrow protection on Bozor Narxida.`;
    }
    return `${name} — ${marketName ? `${marketName} bozorida ` : ""}${city}dagi do'kon. ${productCount} ta mahsulot${ratingBit ? ` · ${ratingBit}` : ""}${priceLine ? ` · ${priceLine}` : ""}. Bozor Narxida'da eskrow himoyasi bilan buyurtma.`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const s = await prisma.bnShop.findUnique({
        where: { slug },
        select: {
            name: true, description: true, city: true, rating: true, ratingCount: true, productCount: true,
            market: { select: { name: true } },
            products: {
                where: { isActive: true, hidden: false, isWholesale: false },
                select: { price: true },
                take: 500,
            },
        },
    });

    if (!s) return { title: slug.replace(/-/g, " ") };

    const prices = s.products.map(p => p.price).filter(Boolean);
    const minP = prices.length ? Math.min(...prices) : null;
    const maxP = prices.length ? Math.max(...prices) : null;
    const priceLine = minP != null && maxP != null
        ? (minP === maxP ? formatUZS(minP, locale) : `${formatUZS(minP, locale)} — ${formatUZS(maxP, locale)}`)
        : null;

    const title = buildTitle(locale, s.name, s.market?.name ?? null, s.city);
    const description = s.description ?? buildDescription(locale, s.name, s.city, s.market?.name ?? null, s.productCount, s.rating, s.ratingCount, priceLine);

    const ogImage = `https://bozornarxida.uz/api/og/bn/shop/${encodeURIComponent(slug)}`;
    const pageUrl = `https://bozornarxida.uz/d/${slug}`;

    return {
        title: { absolute: title },
        description,
        alternates: {
            canonical: pageUrl,
            languages: {
                "uz": `https://bozornarxida.uz/uz/d/${slug}`,
                "ru": `https://bozornarxida.uz/ru/d/${slug}`,
                "en": `https://bozornarxida.uz/en/d/${slug}`,
            },
        },
        openGraph: {
            type: "website",
            title,
            description,
            url: pageUrl,
            siteName: "Bozor Narxida",
            images: [{ url: ogImage, width: 1200, height: 630, alt: s.name }],
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
    const { slug } = await params;
    const data = await getShopBySlug(slug);
    if (!data) notFound();
    const s = data.shop;

    // Ochiq maydonlar — LocalBusiness JSON-LD uchun (DTO'da yo'q)
    const extras = await prisma.bnShop.findUnique({
        where: { slug },
        select: { phone: true, phoneVerified: true, coverUrl: true, description: true },
    });

    const prices = data.products.map(p => p.price).filter(Boolean);
    const priceRange = prices.length
        ? `${Math.min(...prices)}-${Math.max(...prices)} UZS`
        : null;

    return (
        <>
            <BnStoreLd
                slug={s.slug}
                name={s.name}
                description={extras?.description ?? null}
                logo={s.logoUrl}
                cover={extras?.coverUrl ?? null}
                address={s.address}
                city={s.city}
                telephone={extras?.phoneVerified ? extras.phone : null}
                latitude={s.lat}
                longitude={s.lng}
                priceRange={priceRange}
                ratingAvg={s.rating || null}
                ratingCount={s.ratingCount || null}
            />
            <BnBreadcrumbLd items={[
                { name: "Bosh sahifa", url: "/" },
                { name: "Do'konlar", url: "/dokonlar" },
                { name: s.name, url: `/d/${s.slug}` },
            ]} />
            <BnShopPage shop={data.shop} products={data.products} />
        </>
    );
}
