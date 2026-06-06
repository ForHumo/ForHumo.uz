import { setRequestLocale } from "next-intl/server";
import { BrandManage } from "@/components/market/brand-manage";

export async function generateMetadata() { return { title: "Mening brendlarim | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BrandManage />;
}
