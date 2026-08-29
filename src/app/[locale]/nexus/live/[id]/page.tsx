import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { NexusLivePermalink } from "@/components/nexus/nexus-live-permalink";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const l = await prisma.nexusLiveStream.findUnique({
            where: { id },
            select: { title: true, description: true, category: true, hidden: true, profileId: true },
        });
        if (!l || l.hidden) return { title: "Jonli efir | Humo Nexus" };
        const author = await prisma.userProfile.findUnique({ where: { id: l.profileId }, select: { name: true, username: true } });
        const title = `${l.title} | ${author?.name || author?.username || "Streamer"}`;
        const description = l.description?.slice(0, 160) || `${author?.name || author?.username || "Streamer"} jonli efirini ForHumo.uz'da tomosha qiling${l.category ? ` · #${l.category}` : ""}`;
        const ogUrl = `/api/og/nexus-live/${id}`;
        return {
            title, description,
            openGraph: {
                title, description,
                type: "video.other",
                images: [{ url: ogUrl, width: 1200, height: 630, alt: l.title }],
            },
            twitter: {
                card: "summary_large_image",
                title, description,
                images: [ogUrl],
            },
        };
    } catch { return { title: "Jonli efir | Humo Nexus" }; }
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <NexusLivePermalink id={id} />;
}
