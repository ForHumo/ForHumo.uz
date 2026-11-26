import { setRequestLocale } from "next-intl/server";
import EtAthlete from "@/components/esport-test/et-athlete";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EtAthlete />;
}
