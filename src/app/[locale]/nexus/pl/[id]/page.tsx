import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { NexusPlaylistPage } from "@/components/nexus/nexus-playlist-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const pl = await prisma.nexusPlaylist.findUnique({
        where: { id }, select: { name: true, description: true, coverUrl: true, isPublic: true },
    });
    if (!pl || !pl.isPublic) return { title: "Pleylist", robots: { index: false } };
    return {
        title: `${pl.name} — pleylist | Nexus`,
        description: pl.description || `${pl.name} pleylist Nexus'da`,
        openGraph: {
            title: pl.name,
            description: pl.description || undefined,
            images: pl.coverUrl ? [pl.coverUrl] : undefined,
        },
    };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <NexusPlaylistPage id={id} />;
}
