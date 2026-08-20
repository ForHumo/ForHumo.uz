import type { Metadata } from "next";
import { BnMarketsWithFilter } from "@/components/bn/bn-markets-with-filter";
import { getMarkets } from "@/lib/bn-data";
import { prisma } from "@/lib/prisma";
import { BnBreadcrumbLd } from "@/components/bn/bn-jsonld";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

async function getDistricts(): Promise<string[]> {
    const rows = await prisma.bnMarket.findMany({
        where: { isActive: true, district: { not: null } },
        select: { district: true },
        distinct: ["district"],
    }).catch(() => []);
    const arr = rows.map(r => r.district).filter(Boolean) as string[];
    arr.sort((a, b) => a.localeCompare(b, "uz-Latn-UZ"));
    return arr;
}

function slugifyDistrict(d: string): string {
    return d.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

function buildTitle(locale: Locale, activeName: string | null): string {
    if (activeName) {
        if (locale === "ru") return `Базары ${activeName} — Ташкент · Bozor Narxida`;
        if (locale === "en") return `${activeName} district bazaars — Tashkent · Bozor Narxida`;
        return `${activeName} tumani bozorlari — Toshkent · Bozor Narxida`;
    }
    if (locale === "ru") return "Базары Ташкента онлайн · Bozor Narxida";
    if (locale === "en") return "Tashkent bazaars online · Bozor Narxida";
    return "Toshkent bozorlari onlayn · Bozor Narxida";
}

function buildDescription(locale: Locale, count: number, activeName: string | null): string {
    if (activeName) {
        if (locale === "ru") {
            return `${count} базаров в ${activeName}е (Ташкент). Магазины, товары, часы работы, адреса на Bozor Narxida.`;
        }
        if (locale === "en") {
            return `${count} bazaars in ${activeName} district (Tashkent). Browse shops, products, hours, addresses on Bozor Narxida.`;
        }
        return `${activeName} tumanidagi ${count} ta bozor. Do'konlar, mahsulotlar, ish soatlari, manzillar Bozor Narxida'da.`;
    }
    if (locale === "ru") {
        return `${count} базаров Ташкента и Узбекистана в одном месте: Чорсу, Сергели, Малика, Абу Сахий и другие.`;
    }
    if (locale === "en") {
        return `${count} bazaars across Tashkent and Uzbekistan in one place: Chorsu, Sergeli, Malika, Abu Sahiy and more.`;
    }
    return `Toshkentning ${count} ta bozori bir joyda: Chorsu, Sergeli, Malika, Abu Sahiy va boshqalar.`;
}

export async function generateMetadata({
    params, searchParams,
}: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ tuman?: string }>;
}): Promise<Metadata> {
    const [{ locale }, sp, markets, districts] = await Promise.all([
        params, searchParams,
        getMarkets(100).catch(() => []),
        getDistricts(),
    ]);

    const activeName = sp.tuman ? (districts.find(d => slugifyDistrict(d) === sp.tuman) ?? null) : null;
    const filteredCount = activeName
        ? markets.filter(m => (m.district || "Toshkent") === activeName).length
        : markets.length;

    const title = buildTitle(locale, activeName);
    const description = buildDescription(locale, filteredCount, activeName);
    const pageUrl = activeName
        ? `https://bozornarxida.uz/bozorlar?tuman=${sp.tuman}`
        : "https://bozornarxida.uz/bozorlar";

    return {
        title: { absolute: title },
        description,
        alternates: {
            canonical: pageUrl,
            languages: {
                "uz": pageUrl.replace("https://bozornarxida.uz/", "https://bozornarxida.uz/uz/"),
                "ru": pageUrl.replace("https://bozornarxida.uz/", "https://bozornarxida.uz/ru/"),
                "en": pageUrl.replace("https://bozornarxida.uz/", "https://bozornarxida.uz/en/"),
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
    const [markets, districts] = await Promise.all([
        getMarkets(100),
        getDistricts(),
    ]);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: buildTitle(locale, null),
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
            <BnMarketsWithFilter markets={markets} districts={districts} />
        </>
    );
}
