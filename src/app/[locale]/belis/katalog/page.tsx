import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisKatalogPage } from "@/components/belis/belis-katalog-page";

export const metadata: Metadata = {
    title: "Sarpo qutilari katalogi · Belis",
    description: "Fotiha va Beshik to'y uchun ijaraga sarpo qutilari — Toshkent.",
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisKatalogPage />;
}
