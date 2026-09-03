import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisBookingDetail } from "@/components/belis/belis-booking-detail";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
    const { code } = await params;
    return {
        title: `Buyurtma #${code} · Belis`,
        robots: { index: false, follow: false },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: string; code: string }> }) {
    const { locale, code } = await params;
    setRequestLocale(locale);
    return <BelisBookingDetail code={code} />;
}
