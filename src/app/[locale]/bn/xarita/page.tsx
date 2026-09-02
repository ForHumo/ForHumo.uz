import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BnMap } from "@/components/bn/bn-map";
import { BnBackButton } from "@/components/bn/bn-back-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const title = locale === "ru" ? "Карта базаров и магазинов" : locale === "en" ? "Bazaars & Shops Map" : "Bozorlar va do'konlar xaritasi";
    const description = locale === "ru"
        ? "Все базары и магазины Ташкента на интерактивной карте — Bozor Narxida"
        : locale === "en"
            ? "All bazaars and shops in Tashkent on an interactive map — Bozor Narxida"
            : "Toshkent bo'ylab barcha bozor va do'konlar interaktiv xaritada — Bozor Narxida";
    return {
        title,
        description,
        alternates: {
            canonical: `https://bozornarxida.uz/${locale}/xarita`,
            languages: {
                uz: "https://bozornarxida.uz/uz/xarita",
                ru: "https://bozornarxida.uz/ru/xarita",
                en: "https://bozornarxida.uz/en/xarita",
            },
        },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: "bn" });
    void t;

    const title = locale === "ru" ? "Карта" : locale === "en" ? "Map" : "Xarita";
    const subtitle = locale === "ru"
        ? "Все базары и магазины Ташкента"
        : locale === "en"
            ? "All Tashkent bazaars and shops"
            : "Toshkent bo'ylab barcha bozor va do'konlar";

    return (
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-6">
            <BnBackButton />
            <h1 className="text-[24px] sm:text-[28px] font-black mt-3 mb-1">{title}</h1>
            <p className="text-[13px] mb-5" style={{ color: "var(--bn-text-2)" }}>{subtitle}</p>
            <BnMap />
        </div>
    );
}
