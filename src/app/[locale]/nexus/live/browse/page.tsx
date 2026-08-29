import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { NxLiveBrowse } from "@/components/nexus/nx-live-browse";

export const metadata: Metadata = {
    title: "Jonli efirlar — kategoriyalar | Humo Nexus",
    description: "Jonli efirlarni kategoriyalar bo'yicha ko'ring — Suhbat, Musiqa, Ta'lim, Sport, Gaming va boshqalar. Rejalashtirilgan efirlar va top streamerlar.",
    openGraph: { title: "Jonli efirlar hub | Nexus", description: "Kategoriyalar + rejalashtirilgan + top streamerlar" },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <NxLiveBrowse />;
}
