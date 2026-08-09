import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getMarketStaff } from "@/lib/market-staff";
import { MarketWorkersAdmin } from "@/components/market/admin/market-workers-admin";

export async function generateMetadata() { return { title: "Worker'lar | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const staff = await getMarketStaff();
    if (!staff?.isOwner) redirect({ href: "/market/admin", locale });
    return <MarketWorkersAdmin />;
}
