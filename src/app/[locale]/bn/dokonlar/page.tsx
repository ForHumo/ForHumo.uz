import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnPageMeta } from "@/lib/bn-seo";
import { BnShopsWithFilter } from "@/components/bn/bn-shops-with-filter";
import { getTopShops } from "@/lib/bn-data";
import { BnBreadcrumbLd } from "@/components/bn/bn-jsonld";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";
type Tier = "TRUSTED" | "VERIFIED" | "PREMIUM";

function normalizeTier(raw: string | undefined): Tier | null {
    if (!raw) return null;
    const up = raw.toUpperCase();
    return up === "TRUSTED" || up === "VERIFIED" || up === "PREMIUM" ? up as Tier : null;
}

// label — daraja nomi tilga mos (bn.tier.*)
function buildTitle(locale: Locale, tier: Tier | null, label = ""): string {
    if (tier) {
        if (locale === "ru") return `Магазины Ташкента: уровень «${label}»`;
        if (locale === "en") return `${label} shops in Tashkent`;
        return `${label} do'konlar — Toshkent`;
    }
    if (locale === "ru") return "Магазины базаров Ташкента — рейтинг";
    if (locale === "en") return "Tashkent bazaar shops — ranked";
    return "Toshkent bozor do'konlari — reyting";
}

function buildDescription(locale: Locale, count: number, tier: Tier | null, label: string): string {
    if (tier) {
        if (locale === "ru") {
            return `${count} магазинов уровня «${label}» на Ташкентских базарах. Проверенные продавцы, эскроу-защита.`;
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
        params, searchParams, getTopShops(100, true).catch(() => []),
    ]);

    const tier = normalizeTier(sp.tier);
    const filteredCount = tier
        ? shops.filter(s => s.tier === tier).length
        : shops.length;

    const tTier = await getTranslations({ locale, namespace: "bn.tier" });
    const label = tier ? tTier(tier) : "";
    const title = buildTitle(locale, tier, label);
    const description = buildDescription(locale, filteredCount, tier, label);
    const path = tier ? `/dokonlar?tier=${tier.toLowerCase()}` : "/dokonlar";

    return {
        title,
        description,
        ...bnPageMeta({ locale, path, title, description }),
    };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    const shops = await getTopShops(100, true);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: buildTitle(locale, null),
        url: "https://www.bozornarxida.uz/dokonlar",
        inLanguage: locale,
        isPartOf: { "@type": "WebSite", name: "Bozor Narxida", url: "https://www.bozornarxida.uz" },
        mainEntity: {
            "@type": "ItemList",
            numberOfItems: shops.length,
            itemListElement: shops.slice(0, 30).map((s, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://www.bozornarxida.uz/d/${s.slug}`,
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
