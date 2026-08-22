import { setRequestLocale } from "next-intl/server";
import { BelisAccount } from "@/components/belis/belis-account";

export const metadata = { title: "Kabinet — Belis" };

export default async function BelisAccountPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisAccount />;
}
