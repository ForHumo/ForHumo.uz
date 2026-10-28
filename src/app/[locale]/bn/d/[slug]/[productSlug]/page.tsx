// Mahsulot uchun SEO'ga do'stona URL: /d/<shopSlug>/<productSlug>
// Awvalgi /p/<productSlug> ham ishlaydi (backward compat), lekin bu canonical bo'ladi.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildBnFormat } from "@/lib/bn-format";
import { BN_SITE, bnCity, bnPageMeta } from "@/lib/bn-seo";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { BnProductDetail } from "@/components/bn/bn-product-detail";
import { getProductBySlug, getShopBySlug } from "@/lib/bn-data";
import { BnProductLd, BnBreadcrumbLd } from "@/components/bn/bn-jsonld";
import { getBnAuth } from "@/lib/bn-auth";
import { trackBnEvent } from "@/lib/bn-events";
import { bnNotFoundMeta } from "@/lib/bn-seo-server";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

export async function generateMetadata(
    { params }: { params: Promise<{ locale: Locale; slug: string; productSlug: string }> }
): Promise<Metadata> {
    const { locale, slug, productSlug } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    const data = await getProductBySlug(productSlug, null);
    if (!data) return bnNotFoundMeta(locale);

    // Agar shopSlug mos kelmasa — canonical'ni to'g'ri URL'ga o'zgartiramiz
    const correctShopSlug = data.product.shopSlug ?? slug;
    const p = data.product;
    const priceStr = buildBnFormat(t).price(p.price);   // body bilan bir xil: "4 250 000 so'm / сум / UZS"
    const title = `${p.title} — ${priceStr} · ${p.shopName ?? ""}`;

    // Tavsif: nom + narx + do'kon/joy, bozor o'rtachasidan tejash (vitrina bilan bir xil
    // ishonchlilik sharti: >60% farq — ko'rsatilmaydi) va "ko'rib olish" belgisi.
    const avg = p.marketAvgPrice;
    const plausible = !!avg && avg > 0 && p.price > 0 && Math.abs(p.price - avg) / avg <= 0.6;
    const pct = plausible && avg && p.price < avg ? Math.round(((avg - p.price) / avg) * 100) : 0;
    const place = p.marketName || bnCity(p.city, locale);
    const description = [
        t("seo.productDesc", { title: p.title, price: priceStr, shop: p.shopName ?? "", place }),
        pct > 0 ? t("seo.productCheaper", { pct }) : null,
        p.allowInspect ? t("seo.productInspect") : null,
    ].filter(Boolean).join(" ");

    // Asosiy rasm — brendli OG karta (narx + do'kon); keyin mahsulotning o'z rasmi
    const ogImage = `${BN_SITE}/api/og/bn/product/${encodeURIComponent(p.slug)}${locale === "uz" ? "" : `?l=${locale}`}`;
    const images = [
        { url: ogImage, width: 1200, height: 630, alt: p.title },
        ...p.images.slice(0, 1).map(img => ({ url: img, alt: p.title })),
    ];
    return {
        title,
        description,
        ...bnPageMeta({ locale, path: `/d/${correctShopSlug}/${p.slug}`, title, description, images }),
    };
}

export default async function Page({
    params,
}: { params: Promise<{ locale: Locale; slug: string; productSlug: string }> }) {
    const { locale, slug, productSlug } = await params;
    const auth = await getBnAuth();
    const data = await getProductBySlug(productSlug, auth?.profileId ?? null);
    if (!data) notFound();
    const t = await getTranslations({ locale, namespace: "bn" });

    const correctShopSlug = data.product.shopSlug;
    // Agar URL'dagi shopSlug mahsulot do'koni bilan mos kelmasa — to'g'risiga redirect
    if (correctShopSlug && correctShopSlug !== slug) {
        redirect(`/${locale}/bn/d/${correctShopSlug}/${productSlug}`);
    }

    const shopData = correctShopSlug ? await getShopBySlug(correctShopSlug) : null;
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
                { name: t("breadcrumb.home"), url: "/" },
                { name: t("shops.title"), url: "/dokonlar" },
                ...(p.shopSlug && p.shopName ? [{ name: p.shopName, url: `/d/${p.shopSlug}` }] : []),
                { name: p.title, url: `/d/${p.shopSlug ?? slug}/${p.slug}` },
            ]} />
            <BnProductDetail
                product={data.product}
                shop={shopData?.shop ?? null}
                similar={data.similar}
                others={data.others}
                soldRecent={data.soldRecent}
                buyersRecent={data.buyersRecent}
                viewersRecent={data.viewersRecent}
                reviewVideos={data.reviewVideos.map(v => ({
                    id: v.id, title: v.title, thumbUrl: v.thumbUrl, views: v.views,
                }))}
                fits={data.fits}
                partNumber={data.partNumber}
                oemNumbers={data.oemNumbers}
                universalFit={data.universalFit}
            />
        </>
    );
}
