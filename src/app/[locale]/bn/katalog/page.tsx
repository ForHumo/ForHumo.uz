import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { bnPageMeta } from "@/lib/bn-seo";
import { BnCatalogPage } from "@/components/bn/bn-sections";
import { getCategoriesTree, localizeCategoryTree } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "bn" });
    const title = t("catalog.catalog");
    const description = t("seo.catalogDesc");
    return { title, description, ...bnPageMeta({ locale, path: "/katalog", title, description }) };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    // ru'da kategoriya nomlari nameRu'dan (bo'lsa)
    const categories = localizeCategoryTree(await getCategoriesTree(), locale);
    return <BnCatalogPage categories={categories} />;
}
