import { setRequestLocale } from "next-intl/server";
import { MarketAssistant } from "@/components/market/market-assistant";

export async function generateMetadata() { return { title: "AI yordamchi | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <MarketAssistant />;
}
