import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisComingSoon } from "@/components/belis/belis-coming-soon";

export const metadata: Metadata = {
    title: "Humo AI · Belis",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <BelisComingSoon
            title="Humo AI yordamchi"
            description="Belis'da Humo AI yordamida marosim uchun to'g'ri komplekt tanlash, sana taklifi va tavsiyalar tez orada ishga tushadi."
            imageSrc="/logos/humo-ai-black.png"
        />
    );
}
