import { setRequestLocale } from "next-intl/server";
import { SellerDashboard } from "@/components/market/seller-dashboard";

export async function generateMetadata() { return { title: "Mahsulotlar | Admin" }; }

// Hozircha SellerDashboard mahsulotlar ro'yxatini ham ko'rsatadi.
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <SellerDashboard />;
}
