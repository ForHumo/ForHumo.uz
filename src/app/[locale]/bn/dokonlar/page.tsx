import type { Metadata } from "next";
import { BnShopsWithFilter } from "@/components/bn/bn-shops-with-filter";
import { getTopShops } from "@/lib/bn-data";
import { BnBreadcrumbLd } from "@/components/bn/bn-jsonld";
import { TIER_META } from "@/lib/bn-theme";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";
type Tier = "TRUSTED" | "VERIFIED" | "PREMIUM";

function normalizeTier(raw: string | undefined): Tier | null {
    if (!raw) return null;
    const up = raw.toUpperCase();
    return up === "TRUSTED" || up === "VERIFIED" || up === "PREMIUM" ? up as Tier : null;
}

function buildTitle(locale: Locale, tier: Tier | null): string {
    if (tier) {
        const label = TIER_META[tier].label;
        if (locale === "ru") return `${label} магазины Ташкента · Bozor Narxida`;
        if (locale === "en") return `${label} shops in Tashkent · Bozor Narxida`;
        return `${label} do'konlari — Toshkent · Bozor Narxida`;
    }
    if (locale === "ru") return "Магазины базаров Ташкента — рейтинг · Bozor Narxida";
    if (locale === "en") return "Tashkent bazaar shops — ranked · Bozor Narxida";
    return "Toshkent bozor do'konlari — reyting · Bozor Narxida";
}

function buildDescription(locale: Locale, count: number, tier: Tier | null): string {
    if (tier) {
        const label = TIER_META[tier].label;
        if (locale === "ru") {
            return `${count} магазинов уровня ${label} на Ташкентских базарах. Проверенные продавцы, эскроу-защита.`;
        }
        if (locale === "en") {
            return `${count} ${label}-tier shops across Tashkent bazaars. Verified sellers, escrow protection.`;
        }
        return `Toshkent bozorlaridagi ${count} ta ${label} darajali do'kon. Tekshirilgan sotuvchilar, eskrow himoyasi.`;
    }
    if (locale === "ru") {
        return `${count} лучших магазинов Ташкентских базаров, отсортированных по рейтингу и отзывам.`;
    }
    if (locale === "en") {
        return `Top ${count} bazaar shops across Tashkent, ranked by rating and reviews.`;
    }
    return `Toshkent bozorlaridagi ${count} ta eng yaxshi do'kon — reyting va sharhlar bo'yicha saralangan.`;
}

export async function generateMetadata({
    params, searchParams,
}: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ tier?: string }>;
}): Promise<Metadata> {
    const [{ locale }, sp, shops] = await Promise.all([
        params, searchParams, getTopShops(100).catch(() => []),
    ]);

    const tier = normalizeTier(sp.tier);
    const filteredCount = tier
        ? shops.filter(s => s.tier === tier).length
        : shops.length;

    const title = buildTitle(locale, tier);
    const description = buildDescription(locale, filteredCount, tier);
    const pageUrl = tier
        ? `https://bozornarxida.uz/dokonlar?tier=${tier.toLowerCase()}`
        : "https://bozornarxida.uz/dokonlar";

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
            title, description, url: pageUrl,
            siteName: "Bozor Narxida",
        },
        twitter: {
            card: "summary_large_image",
            title, description,
        },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    const shops = await getTopShops(100);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: buildTitle(locale, null),
        url: "https://bozornarxida.uz/dokonlar",
        inLanguage: locale,
        isPartOf: { "@type": "WebSite", name: "Bozor Narxida", url: "https://bozornarxida.uz" },
        mainEntity: {
            "@type": "ItemList",
            numberOfItems: shops.length,
            itemListElement: shops.slice(0, 30).map((s, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://bozornarxida.uz/d/${s.slug}`,
                name: s.name,
            })),
        },
    };

    return (
        <>
            <script type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <BnBreadcrumbLd items={[
                { name: "Bosh sahifa", url: "/" },
                { name: "Do'konlar", url: "/dokonlar" },
            ]} />
            <BnShopsWithFilter shops={shops} />
        </>
    );
}
