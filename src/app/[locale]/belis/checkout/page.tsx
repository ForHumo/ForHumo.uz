import { setRequestLocale } from "next-intl/server";
import { BelisCheckout } from "@/components/belis/belis-checkout";

export const metadata = { title: "Buyurtma — Belis" };

export default async function BelisCheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisCheckout />;
}
