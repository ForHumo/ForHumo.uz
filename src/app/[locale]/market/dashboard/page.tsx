import { setRequestLocale } from "next-intl/server";
import { SellerDashboard } from "@/components/market/seller-dashboard";

export async function generateMetadata() { return { title: "Dashboard | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <SellerDashboard />;
}
