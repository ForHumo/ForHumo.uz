import type { Metadata } from "next";
import { BnCatalogPage } from "@/components/bn/bn-sections";
import { getCategoriesTree } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Katalog — Bozor Narxida" };

export default async function Page() {
    const categories = await getCategoriesTree();
    return <BnCatalogPage categories={categories} />;
}
