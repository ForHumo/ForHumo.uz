import { setRequestLocale } from "next-intl/server";
import EtTournaments from "@/components/esport-test/et-tournaments";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EtTournaments />;
}
