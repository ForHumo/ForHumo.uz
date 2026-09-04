import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { KnowledgeDashboard } from "@/components/id/knowledge-dashboard";

export const metadata: Metadata = {
    title: "Bilim bazam · Humo ID",
    description: "For Humo AI siz haqingizda nima biladi. To'liq ko'rish, tahrirlash yoki o'chirish.",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <KnowledgeDashboard />;
}
