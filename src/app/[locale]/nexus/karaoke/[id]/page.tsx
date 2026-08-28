import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { NexusKaraokePermalink } from "@/components/nexus/nexus-karaoke-permalink";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const p = await prisma.nexusKaraokePerformance.findFirst({
            where: { id, hidden: false }, select: { trackId: true, score: true, caption: true },
        });
        if (!p) return { title: "Karaoke | Humo Nexus" };
        const t = await prisma.nexusTrack.findUnique({ where: { id: p.trackId }, select: { title: true, artist: true } });
        return {
            title: `Karaoke${t ? " — " + t.title : ""} (${p.score} ball) | Humo Nexus`,
            description: p.caption || `Karaoke ijro — ${p.score} ball`,
        };
    } catch { return { title: "Karaoke | Humo Nexus" }; }
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <NexusKaraokePermalink id={id} />;
}
