import type { Metadata } from "next";
import { BnCatalog } from "@/components/bn/bn-catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    return { title: `${slug.replace(/-/g, " ")} — Bozor Narxida` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <BnCatalog categorySlug={slug} />;
}
