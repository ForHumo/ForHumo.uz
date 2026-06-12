import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { NexusTrackPermalink } from "@/components/nexus/nexus-track-permalink";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const t = await prisma.nexusTrack.findUnique({ where: { id }, select: { title: true, artist: true, hidden: true } });
        if (!t || t.hidden) return { title: "Trek | Humo Nexus" };
        return { title: `${t.title}${t.artist ? " — " + t.artist : ""} | Humo Nexus` };
    } catch { return { title: "Trek | Humo Nexus" }; }
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <NexusTrackPermalink id={id} />;
}
