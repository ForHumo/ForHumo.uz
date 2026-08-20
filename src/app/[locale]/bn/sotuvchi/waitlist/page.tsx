import type { Metadata } from "next";
import { BnSellerWaitlist } from "@/components/bn/bn-seller-waitlist";
import { getMarkets } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Sotuvchi ro'yxatga yozilish",
    description: "MChJ ochilishidan oldin BN sotuvchilari ro'yxatiga yozing — telefon qoldiring, biz qo'ng'iroq qilamiz.",
    robots: { index: true, follow: true },
};

export default async function Page() {
    const markets = await getMarkets(20);
    return <BnSellerWaitlist markets={markets} />;
}
