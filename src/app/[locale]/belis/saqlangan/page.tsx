import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisComingSoon } from "@/components/belis/belis-coming-soon";

export const metadata: Metadata = {
    title: "Sevimlilar · Belis",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <BelisComingSoon
            title="Sevimlilar"
            description="Yoqqan komplektlar va qutilarni belgilab, keyingi marosim uchun tez topish. Tez orada."
        />
    );
}
