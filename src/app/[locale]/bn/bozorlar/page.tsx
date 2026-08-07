import type { Metadata } from "next";
import { BnMarketsList } from "@/components/bn/bn-catalog";
import { getMarkets } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Bozorlar",
    description: "Toshkent bozorlari onlayn: Sergeli, Chorsu, Malika, Abu Sahiy va boshqalar.",
};

export default async function Page() {
    const markets = await getMarkets(50);
    return <BnMarketsList markets={markets} />;
}
