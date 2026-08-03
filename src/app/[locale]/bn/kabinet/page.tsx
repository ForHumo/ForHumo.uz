import type { Metadata } from "next";
import { BnCabinet } from "@/components/bn/bn-cabinet";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Kabinet — Bozor Narxida",
    robots: { index: false, follow: false },
};

export default function Page() {
    return <BnCabinet />;
}
