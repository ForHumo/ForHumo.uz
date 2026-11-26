import { setRequestLocale } from "next-intl/server";
import EtTeams from "@/components/esport-test/et-teams";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EtTeams />;
}
