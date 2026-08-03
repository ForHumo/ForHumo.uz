import { setRequestLocale } from "next-intl/server";
import { BnSellerDashboard } from "@/components/bn/bn-seller-dashboard";

export async function generateMetadata() {
    return { title: "Sotuvchi paneli — Bozor Narxida" };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BnSellerDashboard />;
}
