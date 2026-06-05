import { setRequestLocale } from "next-intl/server";
import { MarketCart } from "@/components/market/market-cart";
export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <MarketCart />;
}
