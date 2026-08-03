import type { Metadata } from "next";
import { BnCatalog } from "@/components/bn/bn-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Qidiruv — Bozor Narxida" };

export default async function Page({
    searchParams,
}: { searchParams: Promise<{ q?: string; sort?: string }> }) {
    const sp = await searchParams;
    const sort = sp.sort === "cheap" ? "cheap" : "new";
    return <BnCatalog query={sp.q ?? ""} initialSort={sort} />;
}
