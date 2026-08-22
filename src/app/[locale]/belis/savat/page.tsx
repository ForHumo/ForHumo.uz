import { setRequestLocale, getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { BelisCart } from "@/components/belis/belis-cart";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "belis" });
    return { title: `${t("cart.title")} — Belis` };
}

export default async function BelisCartPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisCart />;
}
