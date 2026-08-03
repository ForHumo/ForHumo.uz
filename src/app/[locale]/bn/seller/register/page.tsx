import { setRequestLocale } from "next-intl/server";
import { BnSellerRegister } from "@/components/bn/bn-seller-register";

export async function generateMetadata() {
    return { title: "Sotuvchi bo'lish — Bozor Narxida" };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BnSellerRegister />;
}
