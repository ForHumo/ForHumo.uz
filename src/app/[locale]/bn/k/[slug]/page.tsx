import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnCatalog, type BnCatalogCategoryDTO } from "@/components/bn/bn-catalog";
import { getCategoryBySlug, getMarkets } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

function priceRange(products: { price: number }[]): { min: number; max: number } | null {
    if (!products.length) return null;
    let min = products[0].price;
    let max = products[0].price;
    for (const p of products) {
        if (p.price < min) min = p.price;
        if (p.price > max) max = p.price;
    }
    return { min, max };
}

function formatUZS(n: number, locale: Locale): string {
    const bcp = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-Latn-UZ";
    const num = n.toLocaleString(bcp, { maximumFractionDigits: 0 });
    return locale === "ru" ? `${num} сум` : locale === "en" ? `${num} UZS` : `${num} so'm`;
}

function buildDescription(locale: Locale, name: string, count: number, priceLine: string | null): string {
    if (locale === "ru") {
        return `${name} — цены на Ташкентских базарах и в магазинах. ${count} товаров. `
            + (priceLine ? `Диапазон цен: ${priceLine}. ` : "")
            + `Сравнивайте цены, читайте отзывы и заказывайте с защитой эскроу на Bozor Narxida.`;
    }
    if (locale === "en") {
        return `${name} — real prices from Tashkent bazaars and shops. ${count} items. `
            + (priceLine ? `Price range: ${priceLine}. ` : "")
            + `Compare prices, read reviews and order with escrow protection on Bozor Narxida.`;
    }
    return `${name} — Toshkent bozorlari va do'konlaridagi haqiqiy narxlar. ${count} ta mahsulot. `
        + (priceLine ? `Narx: ${priceLine}. ` : "")
        + `Bozor Narxida'da narxlarni solishtiring, sharhlarni o'qing va eskrow himoyasi bilan buyurtma bering.`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const data = await getCategoryBySlug(slug);
    if (!data) return { title: slug.replace(/-/g, " ") };

    const name = data.category.name;
    const count = data.category.productCount;
    const range = priceRange(data.products);
    const priceLine = range
        ? (range.min === range.max ? formatUZS(range.min, locale) : `${formatUZS(range.min, locale)} — ${formatUZS(range.max, locale)}`)
        : null;

    const titleBase = locale === "ru" ? `${name} — цены на базарах Ташкента`
        : locale === "en" ? `${name} — Tashkent bazaar prices`
        : `${name} — Toshkent bozor narxlari`;

    const description = buildDescription(locale, name, count, priceLine);
    const ogUrl = `https://bozornarxida.uz/api/og/bn/category/${slug}`;
    const pageUrl = `https://bozornarxida.uz/k/${slug}`;

    return {
        title: titleBase,
        description,
        alternates: {
            canonical: pageUrl,
            languages: {
                "uz": `https://bozornarxida.uz/uz/k/${slug}`,
                "ru": `https://bozornarxida.uz/ru/k/${slug}`,
                "en": `https://bozornarxida.uz/en/k/${slug}`,
            },
        },
        openGraph: {
            type: "website",
            title: titleBase,
            description,
            url: pageUrl,
            siteName: "Bozor Narxida",
            images: [{ url: ogUrl, width: 1200, height: 630, alt: name }],
        },
        twitter: {
            card: "summary_large_image",
            title: titleBase,
            description,
            images: [ogUrl],
        },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
    const { locale, slug } = await params;
    const auth = await getBnAuth();
    const data = await getCategoryBySlug(slug, auth?.profileId ?? null);
    if (!data) notFound();

    const c = data.category;
    const parent = c.parent ? await getCategoryBySlug(c.parent.slug, auth?.profileId ?? null) : null;
    const rootCat = parent?.category ?? c;
    const activeSubSlug = c.parentId ? c.slug : undefined;

    const catDTO: BnCatalogCategoryDTO = {
        slug: rootCat.slug,
        name: rootCat.name,
        productCount: rootCat.productCount,
        children: (parent ? parent.category.children : c.children).map(ch => ({
            slug: ch.slug, name: ch.name, productCount: ch.productCount,
        })),
    };

    const markets = await getMarkets(20);

    // JSON-LD ItemList — Google Merchant/Rich Result uchun
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: c.name,
        url: `https://bozornarxida.uz/k/${c.slug}`,
        inLanguage: locale,
        isPartOf: {
            "@type": "WebSite",
            name: "Bozor Narxida",
            url: "https://bozornarxida.uz",
        },
        mainEntity: {
            "@type": "ItemList",
            numberOfItems: c.productCount,
            itemListElement: data.products.slice(0, 20).map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://bozornarxida.uz/p/${p.slug}`,
                name: p.title,
            })),
        },
    };

    return (
        <>
            <script type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <BnCatalog
                initialProducts={data.products}
                markets={markets}
                category={catDTO}
                activeSubSlug={activeSubSlug}
            />
        </>
    );
}
