import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BnLocationPage } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

// Shaxsiy sahifa — indekslanmaydi; sarlavha tilga mos
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    return { title: t("pages.locationTitle"), robots: { index: false, follow: false } };
}

export default function Page() {
    return <BnLocationPage />;
}
