import type { Metadata } from "next";
import { BnMedia } from "@/components/bn/bn-media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Nexus — Bozor Narxida",
    description: "Sotuvchilarning postlari, reels va reklamalari. Humo Nexus bilan integratsiya.",
};

export default function Page() {
    return <BnMedia />;
}
