import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisMyBookings } from "@/components/belis/belis-my-bookings";

export const metadata: Metadata = {
    title: "Mening arizalarim · Belis",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BelisMyBookings />;
}
