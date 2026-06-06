import { setRequestLocale } from "next-intl/server";
import { MarketCart } from "@/components/market/market-cart";

export async function generateMetadata() { return { title: "Buyurtmalarim | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <MarketCart defaultTab="orders" />;
}
