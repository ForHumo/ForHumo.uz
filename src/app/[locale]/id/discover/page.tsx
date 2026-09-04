import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DiscoverOnboarding } from "@/components/id/discover-onboarding";

export const metadata: Metadata = {
    title: "Sizni tanib olamiz · Humo ID",
    description: "For Humo AI sizni yaxshi tanish uchun bir necha savol. Har fakt shifrlangan va faqat siz ko'rasiz.",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <DiscoverOnboarding />;
}
