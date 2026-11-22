import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnPageMeta } from "@/lib/bn-seo";
import { BnSellerWaitlist } from "@/components/bn/bn-seller-waitlist";
import { getMarkets } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    const title = t("waitlist.title");
    const description = t("seo.waitlistDesc");
    return {
        title,
        description,
        robots: { index: true, follow: true },
        ...bnPageMeta({ locale, path: "/sotuvchi/waitlist", title, description }),
    };
}

export default async function Page() {
    const markets = await getMarkets(20);
    return <BnSellerWaitlist markets={markets} />;
}
