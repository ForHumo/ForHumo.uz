import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnShopPage } from "@/components/bn/bn-pages";
import { getShopBySlug } from "@/lib/bn-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const s = await prisma.bnShop.findUnique({ where: { slug }, select: { name: true, description: true } });
    return {
        title: `${s?.name ?? slug.replace(/-/g, " ")}`,
        description: s?.description ?? undefined,
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await getShopBySlug(slug);
    if (!data) notFound();
    return <BnShopPage shop={data.shop} products={data.products} />;
}
