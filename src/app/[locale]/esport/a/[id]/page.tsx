import { setRequestLocale } from "next-intl/server";
import AthleteProfile from "@/components/esport/athlete-profile";

export default async function AthleteProfilePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <AthleteProfile athleteId={id} />;
}
