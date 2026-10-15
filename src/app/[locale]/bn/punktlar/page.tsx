import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnPageMeta } from "@/lib/bn-seo";
import { BnPickupPage } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    const title = t("pages.pickupTitle");
    const description = t("pages.pickupSub");
    return { title, description, ...bnPageMeta({ locale, path: "/punktlar", title, description }) };
}

export default function Page() {
    return <BnPickupPage />;
}
