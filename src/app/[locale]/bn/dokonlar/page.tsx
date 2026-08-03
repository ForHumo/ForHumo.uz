import type { Metadata } from "next";
import { BnShopsRanked } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Do'konlar — Bozor Narxida",
    description: "Bozordagi va ko'chadagi do'konlar reyting bo'yicha saralangan.",
};

export default function Page() {
    return <BnShopsRanked />;
}
