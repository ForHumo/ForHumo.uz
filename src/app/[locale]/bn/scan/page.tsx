import type { Metadata } from "next";
import { BnScanClient } from "@/components/bn/bn-scan-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Skaner — Bozor Narxida",
    description: "Mahsulot rasmini yuklab AI orqali sotayotgan do'konlarni toping.",
};

export default function Page() {
    return <BnScanClient />;
}
