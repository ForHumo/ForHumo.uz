import type { Metadata } from "next";
import { BnLocationPage } from "@/components/bn/bn-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mening joylashuvim", robots: { index: false, follow: false } };

export default function Page() {
    return <BnLocationPage />;
}
