import { setRequestLocale } from "next-intl/server";
import { SellerOrders } from "@/components/market/seller-orders";

export async function generateMetadata() { return { title: "Buyurtmalar | Admin" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <SellerOrders />;
}
