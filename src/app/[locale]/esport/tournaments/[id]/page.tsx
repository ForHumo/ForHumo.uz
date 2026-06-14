import { setRequestLocale } from "next-intl/server";
import TournamentDetail from "@/components/esport/tournament-detail";

export default async function TournamentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <TournamentDetail tournamentId={id} />;
}
