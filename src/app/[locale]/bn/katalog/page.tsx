import type { Metadata } from "next";
import { BnCatalogPage } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Katalog — Bozor Narxida" };

export default function Page() {
    return <BnCatalogPage />;
}
