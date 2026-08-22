import { setRequestLocale, getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { BelisHome } from "@/components/belis/belis-home";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "belis" });
    return {
        title: `${t("brand")} — ${t("hero.subtitle")}`,
        description: t("hero.subtitle"),
        openGraph: {
            title: t("brand"),
            description: t("hero.subtitle"),
            locale,
        },
    };
}

export default async function BelisHomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisHome />;
}
