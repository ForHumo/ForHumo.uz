import { setRequestLocale } from "next-intl/server";
import { BelisOrderDetail } from "@/components/belis/belis-order-detail";

export const metadata = { title: "Buyurtma — Belis" };

export default async function BelisOrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <BelisOrderDetail orderId={id} />;
}
