import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { NexusChannelPublic } from "@/components/nexus/nexus-channel-public";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;
    try {
        const ch = await prisma.nexusChannel.findFirst({
            where: { handle: handle.toLowerCase(), hidden: false },
            select: { name: true, description: true, avatarUrl: true, isPrivate: true },
        });
        if (!ch) return { title: "Kanal | Humo Nexus" };
        const desc = ch.description || `${ch.name} — Humo Nexus'da ${ch.isPrivate ? "yopiq" : "ochiq"} kanal`;
        return {
            title: `${ch.name} · @${handle} | Humo Nexus`,
            description: desc.slice(0, 160),
            openGraph: {
                title: ch.name,
                description: desc.slice(0, 200),
                images: ch.avatarUrl ? [{ url: ch.avatarUrl }] : undefined,
                type: "website",
            },
            twitter: {
                card: "summary_large_image",
                title: ch.name,
                description: desc.slice(0, 200),
                images: ch.avatarUrl ? [ch.avatarUrl] : undefined,
            },
        };
    } catch { return { title: "Kanal | Humo Nexus" }; }
}

export default async function Page({ params }: { params: Promise<{ locale: string; handle: string }> }) {
    const { locale, handle } = await params;
    setRequestLocale(locale);
    return <NexusChannelPublic handle={handle} />;
}
