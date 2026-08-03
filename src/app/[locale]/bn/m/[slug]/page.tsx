import type { Metadata } from "next";
import { BnMarketPage } from "@/components/bn/bn-pages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    return { title: `${slug.replace(/-/g, " ")} — Bozor Narxida` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <BnMarketPage slug={slug} />;
}
