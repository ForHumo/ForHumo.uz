import type { Metadata } from "next";
import { BnHome } from "@/components/bn/bn-home";
import { getHomeData } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

// Bosh sahifada template ishlatmaymiz — to'liq title layout metadatasidan (default).
export const metadata: Metadata = {
    description:
        "O'zbekiston bozorlari va do'konlari onlayn. Har mahsulot narxi bozor o'rtachasi bilan solishtiriladi. "
        + "Ko'rib sotib olish, xavfsiz to'lov, rasmiy sotuvchilar.",
};

export default async function Page() {
    const data = await getHomeData();
    return <BnHome initial={data} />;
}
