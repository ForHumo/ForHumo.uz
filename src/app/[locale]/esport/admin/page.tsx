import { setRequestLocale } from "next-intl/server";
import EsportAdmin from "@/components/esport/esport-admin";

export default async function EsportAdminPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EsportAdmin />;
}
