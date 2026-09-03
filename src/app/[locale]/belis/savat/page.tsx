import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisComingSoon } from "@/components/belis/belis-coming-soon";

export const metadata: Metadata = {
    title: "Savat · Belis",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <BelisComingSoon
            title="Savat"
            description="Bir necha komplekt va qutilarni oldindan yig'ib, bitta arizada yuborish. Tez orada."
        />
    );
}
