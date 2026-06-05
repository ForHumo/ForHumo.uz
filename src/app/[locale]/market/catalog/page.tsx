import { setRequestLocale } from "next-intl/server";
import { MarketCatalog } from "@/components/market/market-catalog";
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <MarketCatalog />;
}
