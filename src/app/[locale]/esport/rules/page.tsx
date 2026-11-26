import { setRequestLocale } from "next-intl/server";
import EtRules from "@/components/esport-test/et-rules";

export const metadata = { title: "Turnir nizomi | Humo eSport" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <EtRules />;
}
