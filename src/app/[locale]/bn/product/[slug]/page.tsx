import { setRequestLocale } from "next-intl/server";
import { BnProductDetail } from "@/components/bn/bn-product-detail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return { title: `${slug.replace(/-/g, " ")} — Bozor Narxida` };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    setRequestLocale(locale);
    return <BnProductDetail slug={slug} />;
}
