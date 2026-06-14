import { setRequestLocale } from "next-intl/server";
import StandingsView from "@/components/esport/standings-view";

export default async function StandingsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <StandingsView />;
}
