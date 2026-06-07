import { setRequestLocale } from "next-intl/server";
import { BrandProfile } from "@/components/market/brand-profile";

export async function generateMetadata() { return { title: "Brend | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    setRequestLocale(locale);
    return <BrandProfile slug={slug} />;
}
