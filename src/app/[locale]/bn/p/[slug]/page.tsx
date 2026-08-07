import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnProductDetail } from "@/components/bn/bn-product-detail";
import { getProductBySlug, getShopBySlug } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const data = await getProductBySlug(slug);
    if (!data) return { title: "Mahsulot topilmadi" };
    const p = data.product;
    return {
        title: `${p.title}`,
        description: p.description ?? `${p.title}. ${p.price.toLocaleString("uz-UZ")} so'm. ${p.shopName} do'konidan.`,
        openGraph: p.images[0] ? { images: [p.images[0]] } : undefined,
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await getProductBySlug(slug);
    if (!data) notFound();
    const shopData = data.product.shopSlug ? await getShopBySlug(data.product.shopSlug) : null;
    return (
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
    );
}
