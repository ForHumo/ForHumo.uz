import type { Metadata } from "next";
import { BnShopsRanked } from "@/components/bn/bn-sections";
import { getTopShops } from "@/lib/bn-data";
import { BnBreadcrumbLd } from "@/components/bn/bn-jsonld";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

function buildTitle(locale: Locale): string {
    if (locale === "ru") return "Магазины базаров Ташкента — рейтинг · Bozor Narxida";
    if (locale === "en") return "Tashkent bazaar shops — ranked · Bozor Narxida";
    return "Toshkent bozor do'konlari — reyting · Bozor Narxida";
}

function buildDescription(locale: Locale, count: number): string {
    if (locale === "ru") {
        return `${count} лучших магазинов Ташкентских базаров, отсортированных по рейтингу и отзывам. `
            + `Проверенные продавцы, эскроу-защита, доставка или самовывоз.`;
    }
    if (locale === "en") {
        return `Top ${count} bazaar shops across Tashkent, ranked by rating and reviews. `
            + `Verified sellers, escrow protection, delivery or pickup.`;
    }
    return `Toshkent bozorlaridagi ${count} ta eng yaxshi do'kon — reyting va sharhlar bo'yicha saralangan. `
        + `Tekshirilgan sotuvchilar, eskrow himoyasi, yetkazish yoki olib ketish.`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
    const { locale } = await params;
    const shops = await getTopShops(100).catch(() => []);
    const title = buildTitle(locale);
    const description = buildDescription(locale, shops.length);
    const pageUrl = "https://bozornarxida.uz/dokonlar";

    return {
        title: { absolute: title },
        description,
        alternates: {
            canonical: pageUrl,
            languages: {
                "uz": "https://bozornarxida.uz/uz/dokonlar",
                "ru": "https://bozornarxida.uz/ru/dokonlar",
                "en": "https://bozornarxida.uz/en/dokonlar",
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
    const shops = await getTopShops(100);

    // ItemList — Google Rich Result (ranking) uchun ideal
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: buildTitle(locale),
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
            <BnShopsRanked shops={shops} />
        </>
    );
}
