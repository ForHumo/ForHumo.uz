import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BN_SITE, bnCity, bnPageMeta } from "@/lib/bn-seo";
import { notFound } from "next/navigation";
import { BnShopPage } from "@/components/bn/bn-pages";
import { getShopBySlug } from "@/lib/bn-data";
import { prisma } from "@/lib/prisma";
import { BnStoreLd, BnBreadcrumbLd } from "@/components/bn/bn-jsonld";
import { getBnFormat } from "@/lib/bn-format-server";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

// Sarlavha "| Bozor Narxida" shabloni bilan (layout) — suffiks bu yerda yozilmaydi
function buildTitle(name: string, marketName: string | null, city: string): string {
    const loc = marketName ? `${marketName}, ${city}` : city;
    return `${name} — ${loc}`;
}

// productsText — tayyor "N ta mahsulot" (ICU plural, getBnFormat)
function buildDescription(locale: Locale, name: string, city: string, marketName: string | null, productsText: string, rating: number, ratingCount: number, priceLine: string | null): string {
    const ratingBit = ratingCount > 0 ? `★${rating.toFixed(1)} (${ratingCount})` : "";
    if (locale === "ru") {
        return `${name} — ${marketName ? `магазин в «${marketName}», ` : ""}${city}. ${productsText}${ratingBit ? ` · ${ratingBit}` : ""}${priceLine ? ` · ${priceLine}` : ""}. Заказ с защитой эскроу на Bozor Narxida.`;
    }
    if (locale === "en") {
        return `${name} — ${marketName ? `shop at ${marketName}, ` : ""}${city}. ${productsText}${ratingBit ? ` · ${ratingBit}` : ""}${priceLine ? ` · ${priceLine}` : ""}. Order with escrow protection on Bozor Narxida.`;
    }
    return `${name} — ${marketName ? `${marketName} bozorida ` : ""}${city}dagi do'kon. ${productsText}${ratingBit ? ` · ${ratingBit}` : ""}${priceLine ? ` · ${priceLine}` : ""}. Bozor Narxida'da eskrow himoyasi bilan buyurtma.`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const s = await prisma.bnShop.findUnique({
        where: { slug },
        select: {
            id: true, name: true, description: true, city: true,
            market: { select: { name: true, nameRu: true } },
            // Sonlar kesh maydonlardan emas — sahifa bilan bir xil (faol mahsulot, ko'rinadigan sharh)
            _count: { select: { products: { where: { isActive: true, hidden: false } } } },
            products: {
                where: { isActive: true, hidden: false, isWholesale: false },
                select: { price: true },
                take: 500,
            },
        },
    });

    if (!s) return { title: slug.replace(/-/g, " ") };
    const rv = await prisma.bnShopReview.aggregate({
        where: { shopId: s.id, hidden: false },
        _avg: { rating: true },
        _count: { _all: true },
    });
    const rating = rv._avg.rating ?? 0;
    const ratingCount = rv._count._all;

    const prices = s.products.map(p => p.price).filter(Boolean);
    const minP = prices.length ? Math.min(...prices) : null;
    const maxP = prices.length ? Math.max(...prices) : null;
    const fmt = await getBnFormat(locale);
    const priceLine = minP != null && maxP != null
        ? (minP === maxP ? fmt.price(minP) : `${fmt.price(minP)} — ${fmt.price(maxP)}`)
        : null;

    // DB'dagi o'zbekcha nomlar tilga moslanadi (bozor — nameRu, shahar — bnCity)
    const marketName = s.market ? (locale === "ru" && s.market.nameRu ? s.market.nameRu : s.market.name) : null;
    const city = bnCity(s.city, locale);
    const title = buildTitle(s.name, marketName, city);
    const description = s.description ?? buildDescription(locale, s.name, city, marketName, fmt.products(s._count.products), rating, ratingCount, priceLine);

    const ogImage = `${BN_SITE}/api/og/bn/shop/${encodeURIComponent(slug)}${locale === "uz" ? "" : `?l=${locale}`}`;

    return {
        title,
        description,
        ...bnPageMeta({
            locale, path: `/d/${slug}`, title, description,
            images: [{ url: ogImage, width: 1200, height: 630, alt: s.name }],
        }),
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
    const { locale, slug } = await params;
    const data = await getShopBySlug(slug);
    if (!data) notFound();
    const s = data.shop;
    const t = await getTranslations({ locale, namespace: "bn" });

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
                { name: t("breadcrumb.home"), url: "/" },
                { name: t("shops.title"), url: "/dokonlar" },
                { name: s.name, url: `/d/${s.slug}` },
            ]} />
            <BnShopPage shop={data.shop} products={data.products} />
        </>
    );
}
