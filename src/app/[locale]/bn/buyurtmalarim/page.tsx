import type { Metadata } from "next";
import { BnOrdersPage } from "@/components/bn/bn-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Buyurtmalarim — Bozor Narxida" };

export default function Page() {
    return <BnOrdersPage />;
}
