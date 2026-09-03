import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisAdminCalendar } from "@/components/belis/belis-admin-calendar";

export const metadata: Metadata = {
    title: "Kalendar · Belis admin",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisAdminCalendar />;
}
