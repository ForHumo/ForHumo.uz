import { setRequestLocale } from "next-intl/server";
import { getMarketStaff } from "@/lib/market-staff";
import { MarketAdminHome } from "@/components/market/admin/market-admin-home";

export async function generateMetadata() { return { title: "Admin | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const staff = await getMarketStaff();
    return <MarketAdminHome isOwner={!!staff?.isOwner} />;
}
