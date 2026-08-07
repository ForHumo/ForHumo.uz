import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BnShopPage } from "@/components/bn/bn-pages";
import { getShopBySlug } from "@/lib/bn-data";
import { prisma } from "@/lib/prisma";
import { BnStoreLd, BnBreadcrumbLd } from "@/components/bn/bn-jsonld";

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
    const s = data.shop;
    return (
        <>
            <BnStoreLd
                slug={s.slug}
                name={s.name}
                description={null}
                logo={s.logoUrl}
                address={s.address}
                city={s.city}
                ratingAvg={s.rating || null}
                ratingCount={s.ratingCount || null}
            />
            <BnBreadcrumbLd items={[
                { name: "Bosh sahifa", url: "/" },
                { name: "Do'konlar", url: "/dokonlar" },
                { name: s.name, url: `/d/${s.slug}` },
            ]} />
            <BnShopPage shop={data.shop} products={data.products} />
        </>
    );
}
