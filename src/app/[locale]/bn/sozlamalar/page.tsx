import type { Metadata } from "next";
import { BnSettingsPage } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sozlamalar", robots: { index: false, follow: false } };

export default function Page() {
    return <BnSettingsPage />;
}
