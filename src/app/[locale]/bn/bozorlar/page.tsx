import type { Metadata } from "next";
import { BnMarketsList } from "@/components/bn/bn-catalog";
import { getMarkets } from "@/lib/bn-data";
import { BnBreadcrumbLd } from "@/components/bn/bn-jsonld";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

function buildTitle(locale: Locale): string {
    if (locale === "ru") return "Базары Ташкента онлайн · Bozor Narxida";
    if (locale === "en") return "Tashkent bazaars online · Bozor Narxida";
    return "Toshkent bozorlari onlayn · Bozor Narxida";
}

function buildDescription(locale: Locale, count: number): string {
    if (locale === "ru") {
        return `${count} базаров Ташкента и Узбекистана в одном месте: Чорсу, Сергели, Малика, Абу Сахий и другие. `
            + `Смотрите магазины, товары, часы работы, адреса на Bozor Narxida.`;
    }
    if (locale === "en") {
        return `${count} bazaars across Tashkent and Uzbekistan in one place: Chorsu, Sergeli, Malika, Abu Sahiy and more. `
            + `Browse shops, products, working hours and addresses on Bozor Narxida.`;
    }
    return `Toshkentning ${count} ta bozori bir joyda: Chorsu, Sergeli, Malika, Abu Sahiy va boshqalar. `
        + `Do'konlar, mahsulotlar, ish soatlari va manzillar Bozor Narxida'da.`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
    const { locale } = await params;
    const markets = await getMarkets(50).catch(() => []);
    const title = buildTitle(locale);
    const description = buildDescription(locale, markets.length);
    const pageUrl = "https://bozornarxida.uz/bozorlar";

    return {
        title: { absolute: title },
        description,
        alternates: {
            canonical: pageUrl,
            languages: {
                "uz": "https://bozornarxida.uz/uz/bozorlar",
                "ru": "https://bozornarxida.uz/ru/bozorlar",
                "en": "https://bozornarxida.uz/en/bozorlar",
            },
        },
        openGraph: {
            type: "website",
            title,
            description,
            url: pageUrl,
            siteName: "Bozor Narxida",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    const markets = await getMarkets(50);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: buildTitle(locale),
        url: "https://bozornarxida.uz/bozorlar",
        inLanguage: locale,
        isPartOf: { "@type": "WebSite", name: "Bozor Narxida", url: "https://bozornarxida.uz" },
        mainEntity: {
            "@type": "ItemList",
            numberOfItems: markets.length,
            itemListElement: markets.slice(0, 30).map((m, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://bozornarxida.uz/m/${m.slug}`,
                name: m.name,
            })),
        },
    };

    return (
        <>
            <script type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <BnBreadcrumbLd items={[
                { name: "Bosh sahifa", url: "/" },
                { name: "Bozorlar", url: "/bozorlar" },
            ]} />
            <BnMarketsList markets={markets} />
        </>
    );
}
