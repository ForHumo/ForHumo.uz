import type { Metadata } from "next";
import { BnCartPage } from "@/components/bn/bn-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Savat — Bozor Narxida" };

export default function Page() {
    return <BnCartPage />;
}
