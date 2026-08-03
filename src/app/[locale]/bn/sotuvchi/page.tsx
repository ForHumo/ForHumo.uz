import type { Metadata } from "next";
import { BnSellerRegister } from "@/components/bn/bn-seller-register";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Sotuvchi bo'lish — Bozor Narxida",
    description: "Do'koningizni onlaynga chiqaring. YaTT yoki MChJ bilan ro'yxatdan o'ting, komissiya 5%.",
};

export default function Page() {
    return <BnSellerRegister />;
}
