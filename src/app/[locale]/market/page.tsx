import { setRequestLocale } from "next-intl/server";
import { MarketHome } from "@/components/market/market-home";

export async function generateMetadata() {
    return { title: "Humo Market" };
}

export default async function MarketPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <MarketHome />;
}
