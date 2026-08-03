import type { Metadata } from "next";
import { BnFavoritesPage } from "@/components/bn/bn-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sevimlilar — Bozor Narxida" };

export default function Page() {
    return <BnFavoritesPage />;
}
