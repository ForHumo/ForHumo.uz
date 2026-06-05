import { setRequestLocale } from "next-intl/server";
import { ProductDetail } from "@/components/market/product-detail";

export default async function ProductPage({
    params,
}: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    setRequestLocale(locale);
    return <ProductDetail slug={slug} />;
}
