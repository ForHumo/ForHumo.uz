import { setRequestLocale } from "next-intl/server";
import { MarketAISearch } from "@/components/market/market-ai-search";

export async function generateMetadata() { return { title: "AI qidiruv | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <MarketAISearch />;
}
