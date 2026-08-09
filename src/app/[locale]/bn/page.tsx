import type { Metadata } from "next";
import { BnHome } from "@/components/bn/bn-home";
import { getHomeData } from "@/lib/bn-data";
import { BnOrgLd, BnWebsiteLd } from "@/components/bn/bn-jsonld";
import { getBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

// Bosh sahifa: absolute — root layout template ("%s | For Humo")ni chetlab o'tamiz,
// aks holda "Bozor Narxida | For Humo | For Humo" bo'lib qoladi.
export const metadata: Metadata = {
    title: { absolute: "Bozor Narxida | For Humo" },
    description:
        "O'zbekiston bozorlari va do'konlari onlayn. Har mahsulot narxi bozor o'rtachasi bilan solishtiriladi. "
        + "Ko'rib sotib olish, xavfsiz to'lov, rasmiy sotuvchilar.",
};

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
