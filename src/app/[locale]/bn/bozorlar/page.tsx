import type { Metadata } from "next";
import { BnMarketsList } from "@/components/bn/bn-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Bozorlar — Bozor Narxida",
    description: "Toshkent bozorlari onlayn: Sergeli, Chorsu, Malika, Abu Sahiy va boshqalar.",
};

export default function Page() {
    return <BnMarketsList />;
}
