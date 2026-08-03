import type { Metadata } from "next";
import { BnScanPage } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Scan — Bozor Narxida" };

export default function Page() {
    return <BnScanPage />;
}
