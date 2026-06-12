import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { NexusVideoPermalink } from "@/components/nexus/nexus-video-permalink";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const v = await prisma.nexusVideo.findUnique({ where: { id }, select: { title: true, hidden: true, description: true } });
        if (!v || v.hidden) return { title: "Video | Humo Nexus" };
        return { title: `${v.title} | Humo Nexus`, description: v.description?.slice(0, 160) ?? "Humo Nexus video" };
    } catch { return { title: "Video | Humo Nexus" }; }
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <NexusVideoPermalink id={id} />;
}
