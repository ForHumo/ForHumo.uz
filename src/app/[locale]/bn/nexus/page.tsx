import type { Metadata } from "next";
import { BnMedia } from "@/components/bn/bn-media";
import { getTopShops, getHomeData } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Nexus — Bozor Narxida",
    description: "Sotuvchilarning postlari, reels va reklamalari. Humo Nexus bilan integratsiya.",
};

export default async function Page() {
    // FAZA 6 — real Nexus API bilan almashtiriladi. Hozir do'kon+mahsulotdan placeholder.
    const [shops, home] = await Promise.all([getTopShops(6), getHomeData()]);
    return <BnMedia shops={shops} products={home.fresh.slice(0, 6)} />;
}
