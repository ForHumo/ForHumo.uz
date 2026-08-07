import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnCatalog, type BnCatalogCategoryDTO } from "@/components/bn/bn-catalog";
import { getCategoryBySlug, getMarkets } from "@/lib/bn-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const data = await getCategoryBySlug(slug);
    return {
        title: `${data?.category.name ?? slug.replace(/-/g, " ")} — Bozor Narxida`,
        description: data?.category.name
            ? `${data.category.name} kategoriyasi. ${data.products.length} ta mahsulot Toshkent bozorlari va do'konlaridan.`
            : undefined,
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await getCategoryBySlug(slug);
    if (!data) notFound();

    const c = data.category;
    // Agar pastki kategoriya bosilgan bo'lsa — ota-kategoriya breadcrumb uchun kerak
    const parent = c.parent ? await getCategoryBySlug(c.parent.slug) : null;
    const rootCat = parent?.category ?? c;
    const activeSubSlug = c.parentId ? c.slug : undefined;

    const catDTO: BnCatalogCategoryDTO = {
        slug: rootCat.slug,
        name: rootCat.name,
        productCount: rootCat.productCount,
        children: (parent ? parent.category.children : c.children).map(ch => ({
            slug: ch.slug, name: ch.name, productCount: ch.productCount,
        })),
    };

    const markets = await getMarkets(20);

    return (
        <BnCatalog
            initialProducts={data.products}
            markets={markets}
            category={catDTO}
            activeSubSlug={activeSubSlug}
        />
    );
}
