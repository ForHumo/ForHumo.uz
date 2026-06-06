import { setRequestLocale } from "next-intl/server";
import { ProductAdd } from "@/components/market/product-add";

export async function generateMetadata() { return { title: "Mahsulot qo'shish | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <ProductAdd />;
}
