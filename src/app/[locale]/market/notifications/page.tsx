import { setRequestLocale } from "next-intl/server";
import { MarketNotifications } from "@/components/market/market-notifications";

export async function generateMetadata() { return { title: "Bildirishnomalar | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <MarketNotifications />;
}
