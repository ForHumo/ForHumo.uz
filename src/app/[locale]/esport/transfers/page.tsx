import { setRequestLocale } from "next-intl/server";
import TransfersView from "@/components/esport/transfers-view";

export default async function TransfersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <TransfersView />;
}
