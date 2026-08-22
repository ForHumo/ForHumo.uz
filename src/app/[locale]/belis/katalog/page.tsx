import { setRequestLocale, getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { BelisCatalog } from "@/components/belis/belis-catalog";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "belis" });
    return { title: `${t("nav.catalog")} — ${t("brand")}` };
}

export default async function BelisCatalogPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisCatalog />;
}
