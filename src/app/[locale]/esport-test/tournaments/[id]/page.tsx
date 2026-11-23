import { setRequestLocale } from "next-intl/server";
import EtTournamentDetail from "@/components/esport-test/et-tournament-detail";

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <EtTournamentDetail tournamentId={id} />;
}
