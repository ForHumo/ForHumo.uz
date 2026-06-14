import { setRequestLocale } from "next-intl/server";
import TournamentsList from "@/components/esport/tournaments-list";

export default async function TournamentsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <TournamentsList />;
}
