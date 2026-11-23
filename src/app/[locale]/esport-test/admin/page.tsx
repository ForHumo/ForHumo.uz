import { setRequestLocale } from "next-intl/server";
import EtAdmin from "@/components/esport-test/et-admin";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EtAdmin />;
}
