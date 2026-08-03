import type { Metadata } from "next";
import { BnProfilePage } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profil — Bozor Narxida", robots: { index: false, follow: false } };

export default function Page() {
    return <BnProfilePage />;
}
