import { setRequestLocale } from "next-intl/server";
import EsportRules from "@/components/esport/esport-rules";

export const metadata = { title: "Turnir nizomi | Humo eSport" };

export default async function RulesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EsportRules />;
}
