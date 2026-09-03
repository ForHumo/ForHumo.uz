import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisAdminPage } from "@/components/belis/belis-admin-page";

export const metadata: Metadata = {
    title: "Belis admin",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisAdminPage />;
}
