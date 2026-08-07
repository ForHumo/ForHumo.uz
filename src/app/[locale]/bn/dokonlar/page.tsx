import type { Metadata } from "next";
import { BnShopsRanked } from "@/components/bn/bn-sections";
import { getTopShops } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Do'konlar — Bozor Narxida",
    description: "Bozordagi va ko'chadagi do'konlar reyting bo'yicha saralangan.",
};

export default async function Page() {
    const shops = await getTopShops(100);
    return <BnShopsRanked shops={shops} />;
}
