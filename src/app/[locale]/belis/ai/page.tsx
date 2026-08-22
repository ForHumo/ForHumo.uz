import { setRequestLocale } from "next-intl/server";
import { BelisAI } from "@/components/belis/belis-ai";

export const metadata = { title: "Humo AI — Belis" };

export default async function BelisAIPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisAI />;
}
