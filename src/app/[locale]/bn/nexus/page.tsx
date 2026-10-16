import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnPageMeta } from "@/lib/bn-seo";
import { BnMedia } from "@/components/bn/bn-media";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    const title = "Nexus";
    const description = t("seo.nexusDesc");
    return { title, description, ...bnPageMeta({ locale, path: "/nexus", title, description }) };
}

export default function Page() {
    return <BnMedia />;
}
