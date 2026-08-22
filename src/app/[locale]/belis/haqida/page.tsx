import { setRequestLocale, getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { BelisAbout } from "@/components/belis/belis-about";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "belis" });
    return { title: `${t("about.title")} — Belis` };
}

export default async function BelisAboutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisAbout />;
}
