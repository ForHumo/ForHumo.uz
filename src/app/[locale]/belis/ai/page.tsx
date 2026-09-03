import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisAiChat } from "@/components/belis/belis-ai-chat";

export const metadata: Metadata = {
    title: "Humo AI · Belis",
    description: "Humo AI yordamida Belis'dan mos sarpo komplektni tavsiya olish.",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisAiChat />;
}
