import { setRequestLocale } from "next-intl/server";
import EsportHome from "@/components/esport/esport-home";

export default async function EsportPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EsportHome />;
}
