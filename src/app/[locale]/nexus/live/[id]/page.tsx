import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { NexusLivePermalink } from "@/components/nexus/nexus-live-permalink";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const l = await prisma.nexusLiveStream.findUnique({ where: { id }, select: { title: true } });
        return { title: `${l?.title ?? "Jonli efir"} | Humo Nexus` };
    } catch { return { title: "Jonli efir | Humo Nexus" }; }
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <NexusLivePermalink id={id} />;
}
