import { setRequestLocale } from "next-intl/server";
import { BelisFavorites } from "@/components/belis/belis-favorites";

export const metadata = { title: "Saqlangan — Belis" };

export default async function BelisSavedPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisFavorites />;
}
