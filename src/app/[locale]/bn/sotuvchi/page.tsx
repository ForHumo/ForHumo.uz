import type { Metadata } from "next";
import { BnSellerRegister } from "@/components/bn/bn-seller-register";
import { getMarkets } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Sotuvchi bo'lish — Bozor Narxida",
    description: "Do'koningizni onlaynga chiqaring. YaTT yoki MChJ bilan ro'yxatdan o'ting, komissiya 5%.",
};

export default async function Page() {
    const markets = await getMarkets(50);
    return <BnSellerRegister markets={markets} />;
}
