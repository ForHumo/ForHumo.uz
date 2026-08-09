// /market/admin — faqat Owner (founder) va Worker'lar uchun.
// Aks holda /market'ga qaytariladi.

import { redirect } from "@/i18n/routing";
import { getMarketStaff } from "@/lib/market-staff";

export default async function AdminLayout({
    children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const staff = await getMarketStaff();
    if (!staff) redirect({ href: "/market", locale });
    return <>{children}</>;
}
