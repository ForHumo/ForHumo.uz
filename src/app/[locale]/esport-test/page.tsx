import { setRequestLocale } from "next-intl/server";
import EtHome from "@/components/esport-test/et-home";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EtHome />;
}
