import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { NxLiveCategory } from "@/components/nexus/nx-live-category";

const LABELS: Record<string, string> = {
    gaming: "Gaming", musiqa: "Musiqa", dasturlash: "Dasturlash", sport: "Sport",
    talim: "Ta'lim", suhbat: "Suhbat", kulinariya: "Oshxona", shou: "Shou", podkast: "Podkast",
};

export async function generateMetadata({ params }: { params: Promise<{ cat: string }> }): Promise<Metadata> {
    const { cat } = await params;
    const label = LABELS[cat] || cat;
    return {
        title: `#${label} — jonli efirlar | Humo Nexus`,
        description: `${label} kategoriyasi bo'yicha barcha jonli va rejalashtirilgan efirlar. Streamerlarga qo'shiling.`,
        openGraph: { title: `#${label} — jonli efirlar`, description: `${label} kategoriyasi bo'yicha barcha efirlar` },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: string; cat: string }> }) {
    const { locale, cat } = await params;
    setRequestLocale(locale);
    return <NxLiveCategory category={cat} label={LABELS[cat] || cat} />;
}
