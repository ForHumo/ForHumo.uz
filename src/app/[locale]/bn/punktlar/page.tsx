import type { Metadata } from "next";
import { BnPickupPage } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Topshirish punktlari" };

export default function Page() {
    return <BnPickupPage />;
}
