import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BnProductDetail } from "@/components/bn/bn-product-detail";
import { getProductBySlug, getShopBySlug } from "@/lib/bn-data";
import { BnProductLd, BnBreadcrumbLd } from "@/components/bn/bn-jsonld";
import { getBnAuth } from "@/lib/bn-auth";
import { trackBnEvent } from "@/lib/bn-events";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

function formatUZS(n: number, locale: Locale): string {
    const bcp = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-Latn-UZ";
    const num = n.toLocaleString(bcp, { maximumFractionDigits: 0 });
    return locale === "ru" ? `${num} сум` : locale === "en" ? `${num} UZS` : `${num} so'm`;
}

function buildTitle(locale: Locale, title: string, price: number, shopName: string): string {
    const priceStr = formatUZS(price, locale);
    if (locale === "ru") return `${title} — ${priceStr} · ${shopName}`;
    if (locale === "en") return `${title} — ${priceStr} · ${shopName}`;
    return `${title} — ${priceStr} · ${shopName}`;
}

function buildDescription(locale: Locale, title: string, price: number, marketAvg: number | null, shopName: string, marketName: string | null, city: string, ratingAvg: number, ratingCount: number, allowInspect: boolean): string {
    const priceStr = formatUZS(price, locale);
    const savedPct = marketAvg && marketAvg > price
        ? Math.round(((marketAvg - price) / marketAvg) * 100) : 0;
    const ratingBit = ratingCount > 0 ? `★${ratingAvg.toFixed(1)} (${ratingCount})` : "";
    const loc = marketName ? `${marketName}, ${city}` : city;

    if (locale === "ru") {
        return `${title} — ${priceStr}`
            + (savedPct > 0 ? ` (−${savedPct}% от средней по базару)` : "")
            + `. ${shopName}, ${loc}${ratingBit ? ` · ${ratingBit}` : ""}${allowInspect ? " · осмотр перед приёмкой" : ""}. `
            + `Заказ с защитой эскроу на Bozor Narxida.`;
    }
    if (locale === "en") {
        return `${title} — ${priceStr}`
            + (savedPct > 0 ? ` (−${savedPct}% off bazaar average)` : "")
            + `. ${shopName}, ${loc}${ratingBit ? ` · ${ratingBit}` : ""}${allowInspect ? " · inspect on delivery" : ""}. `
            + `Order with escrow protection on Bozor Narxida.`;
    }
    return `${title} — ${priceStr}`
        + (savedPct > 0 ? ` (bozor o'rtachasidan −${savedPct}%)` : "")
        + `. ${shopName}, ${loc}${ratingBit ? ` · ${ratingBit}` : ""}${allowInspect ? " · yetkazishda ko'rib qabul qilish" : ""}. `
        + `Bozor Narxida'da eskrow himoyasi bilan buyurtma.`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const auth = await getBnAuth();
    const data = await getProductBySlug(slug, auth?.profileId ?? null);
    if (!data) return { title: "Mahsulot topilmadi" };
    const p = data.product;

    const title = buildTitle(locale, p.title, p.price, p.shopName);
    const description = buildDescription(
        locale, p.title, p.price, p.marketAvgPrice,
        p.shopName, p.marketName, p.city,
        p.rating, p.ratingCount, p.allowInspect,
    );

    const ogImage = `https://bozornarxida.uz/api/og/bn/product/${encodeURIComponent(slug)}`;
    const pageUrl = `https://bozornarxida.uz/p/${slug}`;

    return {
        title: { absolute: title },
        description,
        alternates: {
            canonical: pageUrl,
            languages: {
                "uz": `https://bozornarxida.uz/uz/p/${slug}`,
                "ru": `https://bozornarxida.uz/ru/p/${slug}`,
                "en": `https://bozornarxida.uz/en/p/${slug}`,
            },
        },
        openGraph: {
            type: "website",
            title,
            description,
            url: pageUrl,
            siteName: "Bozor Narxida",
            images: p.images.length
                ? p.images.slice(0, 4).map(img => ({ url: img, width: 1200, height: 1200, alt: p.title }))
                : [{ url: ogImage, width: 1200, height: 630, alt: p.title }],
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
    const auth = await getBnAuth();
    const data = await getProductBySlug(slug, auth?.profileId ?? null);
    if (!data) notFound();
    const shopData = data.product.shopSlug ? await getShopBySlug(data.product.shopSlug) : null;

    if (auth) {
        const productId = data.product.id;
        after(() => trackBnEvent({ profileId: auth.profileId, productId, type: "VIEW" }));
    }
    const p = data.product;
    return (
        <>
            <BnProductLd
                slug={p.slug}
                title={p.title}
                description={p.description}
                images={p.images}
                price={p.price}
                availability={p.stock > 0 ? "InStock" : "OutOfStock"}
                condition="New"
                sku={p.slug}
                category={p.categorySlug || null}
                shopName={p.shopName}
                shopSlug={p.shopSlug}
                allowInspect={p.allowInspect}
                ratingAvg={p.rating || null}
                ratingCount={p.ratingCount || null}
            />
            <BnBreadcrumbLd items={[
                { name: "Bosh sahifa", url: "/" },
                { name: "Katalog", url: "/katalog" },
                ...(p.categorySlug ? [{ name: p.categorySlug.replace(/-/g, " "), url: `/k/${p.categorySlug}` }] : []),
                { name: p.title, url: `/p/${p.slug}` },
            ]} />
            <BnProductDetail
                product={data.product}
                shop={shopData?.shop ?? null}
                similar={data.similar}
                others={data.others}
                soldRecent={data.soldRecent}
                reviewVideos={data.reviewVideos.map(v => ({
                    id: v.id, title: v.title, thumbUrl: v.thumbUrl, views: v.views,
                }))}
            />
        </>
    );
}
