import { setRequestLocale } from "next-intl/server";
import { ProductEdit } from "@/components/market/product-edit";

export async function generateMetadata() { return { title: "Mahsulotni tahrirlash | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    setRequestLocale(locale);
    return <ProductEdit slug={slug} />;
}
