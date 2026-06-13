import { setRequestLocale } from "next-intl/server";
import TeamsView from "@/components/esport/teams-view";

export default async function TeamsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <TeamsView />;
}
