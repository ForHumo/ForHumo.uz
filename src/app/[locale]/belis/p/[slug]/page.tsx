import { setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { BelisProductDetail } from "@/components/belis/belis-product-detail";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const p = await prisma.belisProduct.findUnique({
        where: { slug }, select: { nameUz: true, nameRu: true, nameEn: true, images: true, price: true, currency: true },
    });
    if (!p) return { title: "Belis" };
    const name = locale === "ru" ? (p.nameRu ?? p.nameUz) : locale === "en" ? (p.nameEn ?? p.nameUz) : p.nameUz;
    const priceLabel = `${Number(p.price).toLocaleString("uz-UZ")} ${p.currency === "USD" ? "$" : "so'm"}`;
    return {
        title: `${name} — ${priceLabel} · Belis`,
        openGraph: { images: p.images[0] ? [{ url: p.images[0] }] : [] },
    };
}

export default async function BelisProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    setRequestLocale(locale);
    return <BelisProductDetail slug={slug} />;
}
