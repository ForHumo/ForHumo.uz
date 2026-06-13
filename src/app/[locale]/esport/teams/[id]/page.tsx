import { setRequestLocale } from "next-intl/server";
import TeamDetail from "@/components/esport/team-detail";

export default async function TeamPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <TeamDetail teamId={id} />;
}
