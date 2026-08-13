import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { NexusChannelMessagePermalink } from "@/components/nexus/nexus-channel-msg-permalink";

export async function generateMetadata({ params }: { params: Promise<{ handle: string; id: string }> }) {
    const { handle, id } = await params;
    try {
        const ch = await prisma.nexusChannel.findFirst({
            where: { handle, hidden: false, isPrivate: false },
            select: { name: true },
        });
        if (!ch) return { title: "Kanal | Humo Nexus" };
        const msg = await prisma.nexusChannelMessage.findUnique({
            where: { id }, select: { text: true, hidden: true },
        });
        const preview = msg && !msg.hidden ? (msg.text?.slice(0, 160) ?? "") : "";
        return {
            title: `${ch.name} · Xabar | Humo Nexus`,
            description: preview || `${ch.name} kanalidagi xabar`,
        };
    } catch { return { title: "Xabar | Humo Nexus" }; }
}

export default async function Page({ params }: { params: Promise<{ locale: string; handle: string; id: string }> }) {
    const { locale, handle, id } = await params;
    setRequestLocale(locale);
    return <NexusChannelMessagePermalink handle={handle} messageId={id} />;
}
