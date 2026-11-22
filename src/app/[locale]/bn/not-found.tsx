// BN ichidagi 404 — BN layout ichida render bo'ladi (header/navbar/footer bilan),
// umumiy For Humo "ishlab chiqilmoqda" sahifasi o'rniga. notFound() (masalan, yo'q mahsulot)
// va noma'lum yo'llar ([...rest]) shu yerga tushadi.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BnNotFoundView } from "@/components/bn/bn-not-found";

export async function generateMetadata(
    { params }: { params?: Promise<{ locale?: string }> },
): Promise<Metadata> {
    const locale = (await params)?.locale;
    const t = await getTranslations({ locale: locale ?? "uz", namespace: "bn" });
    return {
        // Shablon (layout) bilan: "Sahifa topilmadi | Bozor Narxida"
        title: t("notFound.title"),
        robots: { index: false, follow: true },
    };
}

export default function NotFound() {
    return <BnNotFoundView />;
}
