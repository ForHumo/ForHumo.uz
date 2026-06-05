import { setRequestLocale } from "next-intl/server";
import { CreateBrand } from "@/components/market/create-brand";
export default async function CreateBrandPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <CreateBrand />;
}
