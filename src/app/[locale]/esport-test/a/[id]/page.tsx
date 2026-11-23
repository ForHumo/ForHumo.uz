import { setRequestLocale } from "next-intl/server";
import EtAthleteProfile from "@/components/esport-test/et-athlete-profile";

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <EtAthleteProfile athleteId={id} />;
}
