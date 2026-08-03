import type { Metadata } from "next";
import { BnShopsList } from "@/components/bn/bn-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Do'konlar — Bozor Narxida" };

export default function Page() {
    return <BnShopsList />;
}
