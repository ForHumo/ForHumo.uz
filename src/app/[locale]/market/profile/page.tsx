import { setRequestLocale } from "next-intl/server";
import { MarketProfile } from "@/components/market/market-profile";

export async function generateMetadata() { return { title: "Mening profilim | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <MarketProfile />;
}
