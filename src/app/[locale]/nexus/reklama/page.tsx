import { setRequestLocale } from "next-intl/server";
import { NexusAdsPage } from "@/components/nexus/nexus-ads-page";

export async function generateMetadata() {
    return {
        title: "Reklama | Nexus",
        description: "Nexus feed'ida 3 slot reklama. So'nggi CBU kursi bo'yicha shaffof narx.",
        robots: { index: false, follow: false },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <NexusAdsPage />;
}
