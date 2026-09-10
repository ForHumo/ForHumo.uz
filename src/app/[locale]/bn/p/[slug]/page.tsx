// Eski URL /p/[slug] — canonical URL /d/[shopSlug]/[productSlug] ga 308 redirect.
// Backward compat uchun saqlanadi (mavjud tashqi linklar, WhatsApp share, Nexus post'lardagi eski linklar).

import { permanentRedirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Locale = "uz" | "ru" | "en";

export default async function Page({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
    const { locale, slug } = await params;
    const product = await prisma.bnProduct.findUnique({
        where: { slug },
        select: { shop: { select: { slug: true } } },
    });
    if (!product?.shop?.slug) notFound();
    permanentRedirect(`/${locale}/bn/d/${product.shop.slug}/${slug}`);
}
