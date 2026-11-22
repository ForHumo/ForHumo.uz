import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnPageMeta } from "@/lib/bn-seo";
import { BnHome } from "@/components/bn/bn-home";
import { getHomeData } from "@/lib/bn-data";
import { BnOrgLd, BnWebsiteLd } from "@/components/bn/bn-jsonld";
import { getBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

// Bosh sahifa: absolute — root layout template ("%s | For Humo")ni chetlab o'tamiz,
// aks holda "Bozor Narxida | For Humo | For Humo" bo'lib qoladi. Matnlar tilga mos.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    const title = t("seo.homeTitle");
    const description = t("seo.homeDesc");
    return {
        title: { absolute: title },
        description,
        ...bnPageMeta({ locale, path: "/", title, description }),
    };
}

export default async function Page() {
    const auth = await getBnAuth();
    const data = await getHomeData(auth?.profileId ?? null);
    return (
        <>
            <BnOrgLd />
            <BnWebsiteLd />
            <BnHome initial={data} />
        </>
    );
}
