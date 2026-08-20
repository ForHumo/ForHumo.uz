import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BnProductDetail } from "@/components/bn/bn-product-detail";
import { getProductBySlug, getShopBySlug } from "@/lib/bn-data";
import { BnProductLd, BnBreadcrumbLd } from "@/components/bn/bn-jsonld";
import { getBnAuth } from "@/lib/bn-auth";
import { trackBnEvent } from "@/lib/bn-events";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const auth = await getBnAuth();
    const data = await getProductBySlug(slug, auth?.profileId ?? null);
    if (!data) return { title: "Mahsulot topilmadi" };
    const p = data.product;
    const ogImage = `https://bozornarxida.uz/api/og/bn/product/${encodeURIComponent(slug)}`;
    const description = p.description ?? `${p.title}. ${p.price.toLocaleString("uz-UZ")} so'm. ${p.shopName} do'konidan.`;
    return {
        title: p.title,
        description,
        openGraph: {
            title: p.title,
            description,
            images: [{ url: ogImage, width: 1200, height: 630, alt: p.title }],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: p.title,
            description,
            images: [ogImage],
        },
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const auth = await getBnAuth();
    const data = await getProductBySlug(slug, auth?.profileId ?? null);
    if (!data) notFound();
    const shopData = data.product.shopSlug ? await getShopBySlug(data.product.shopSlug) : null;

    // Rekomendatsiya signali — VIEW (kuchsiz, weight 1)
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
                image={p.images[0] ?? null}
                price={p.price}
                availability={p.stock > 0 ? "InStock" : "OutOfStock"}
                ratingAvg={p.rating || null}
                ratingCount={p.ratingCount || null}
                shopName={p.shopName}
            />
            <BnBreadcrumbLd items={[
                { name: "Bosh sahifa", url: "/" },
                { name: "Katalog", url: "/katalog" },
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
