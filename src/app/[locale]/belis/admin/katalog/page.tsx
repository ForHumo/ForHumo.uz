import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisAdminCatalog } from "@/components/belis/belis-admin-catalog";

export const metadata: Metadata = {
    title: "Katalog boshqaruvi · Belis admin",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisAdminCatalog />;
}
