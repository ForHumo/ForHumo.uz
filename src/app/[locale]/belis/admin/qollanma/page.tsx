import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisAdminGuide } from "@/components/belis/belis-admin-guide";

export const metadata: Metadata = {
    title: "Admin qo'llanma · Belis",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisAdminGuide />;
}
