// Mahsulot uchun SEO'ga do'stona URL: /d/<shopSlug>/<productSlug>
// Awvalgi /p/<productSlug> ham ishlaydi (backward compat), lekin bu canonical bo'ladi.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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

export async function generateMetadata(
    { params }: { params: Promise<{ locale: Locale; slug: string; productSlug: string }> }
): Promise<Metadata> {
    const { locale, slug, productSlug } = await params;
    const data = await getProductBySlug(productSlug, null);
    if (!data) return { title: "Mahsulot topilmadi" };

    // Agar shopSlug mos kelmasa — canonical'ni to'g'ri URL'ga o'zgartiramiz
    const correctShopSlug = data.product.shopSlug ?? slug;
    const p = data.product;
    const priceStr = formatUZS(p.price, locale);
    const title = `${p.title} — ${priceStr} · ${p.shopName ?? ""}`;
    const canonical = `https://bozornarxida.uz/d/${correctShopSlug}/${p.slug}`;
    const ogImage = `https://bozornarxida.uz/api/og/bn/product/${p.slug}`;
    return {
        title,
        alternates: { canonical },
        openGraph: {
            type: "website",
            title,
            url: canonical,
            siteName: "Bozor Narxida",
            images: p.images.length
                ? p.images.slice(0, 4).map(img => ({ url: img, width: 1200, height: 1200, alt: p.title }))
                : [{ url: ogImage, width: 1200, height: 630, alt: p.title }],
        },
        twitter: { card: "summary_large_image", title, images: [ogImage] },
    };
}

export default async function Page({
    params,
}: { params: Promise<{ locale: Locale; slug: string; productSlug: string }> }) {
    const { locale, slug, productSlug } = await params;
    const auth = await getBnAuth();
    const data = await getProductBySlug(productSlug, auth?.profileId ?? null);
    if (!data) notFound();

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
                { name: "Bosh sahifa", url: "/" },
                { name: "Do'konlar", url: "/dokonlar" },
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
            />
        </>
    );
}
