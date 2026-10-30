import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnPageMeta } from "@/lib/bn-seo";
import { BnScanClient } from "@/components/bn/bn-scan-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    const title = t("seo.scanTitle");
    const description = t("seo.scanDesc");
    return { title, description, ...bnPageMeta({ locale, path: "/scan", title, description }) };
}

export default function Page() {
    return <BnScanClient />;
}
