import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BelisKomplektDetail } from "@/components/belis/belis-komplekt-detail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    return {
        title: `${slug} · Belis`,
        description: "Sarpo komplekt tafsilotlari va ijara arizasi.",
    };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    setRequestLocale(locale);
    return <BelisKomplektDetail slug={slug} />;
}
