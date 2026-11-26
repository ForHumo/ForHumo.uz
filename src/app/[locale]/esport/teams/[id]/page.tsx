import { setRequestLocale } from "next-intl/server";
import EtTeamDetail from "@/components/esport-test/et-team-detail";

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <EtTeamDetail teamId={id} />;
}
