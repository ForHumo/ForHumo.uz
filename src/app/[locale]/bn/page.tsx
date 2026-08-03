import { setRequestLocale } from "next-intl/server";
import { BnComingSoon } from "@/components/bn/bn-coming-soon";

export async function generateMetadata() {
    return {
        title: "Bozor Narxida — mashina bozor onlayn",
        description: "Sergeli mashina bozori endi onlayn. Ehtiyot qismlar, aksessuarlar — ishonchli sotuvchilardan.",
    };
}

export default async function BnPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BnComingSoon />;
}
