// BN SEO — faqat server uchun yordamchilar (next-intl/server ishlatadi).
// bn-seo.ts client komponentlarga ham import qilinadi, shuning uchun alohida faylda.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnLocale } from "@/lib/bn-seo";

/** Topilmagan sahifa (404) metama'lumoti: sarlavha "Sahifa topilmadi", indekslanmaydi.
 *  Sahifa generateMetadata'si buni qaytarsa layout'ning "index, follow" robots'i ham bekor bo'ladi. */
export async function bnNotFoundMeta(locale: string | undefined | null): Promise<Metadata> {
    const t = await getTranslations({ locale: bnLocale(locale), namespace: "bn" });
    return { title: t("notFound.title"), robots: { index: false, follow: true } };
}
