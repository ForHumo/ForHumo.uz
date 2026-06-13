import { setRequestLocale } from "next-intl/server";
import AthleteOnboarding from "@/components/esport/athlete-onboarding";

export default async function AthletePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <AthleteOnboarding />;
}
