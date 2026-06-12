import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { NexusPostPage } from "@/components/nexus/nexus-post-page";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const post = await prisma.nexusPost.findUnique({
            where: { id }, select: { text: true, hidden: true, privacy: true },
        });
        if (!post || post.hidden) return { title: "Post | Humo Nexus" };
        const snippet = post.text ? post.text.slice(0, 80) : "Humo Nexus posti";
        return {
            title: `${snippet} | Humo Nexus`,
            description: post.privacy === "PUBLIC" && post.text ? post.text.slice(0, 160) : "Humo Nexus",
        };
    } catch {
        return { title: "Post | Humo Nexus" };
    }
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    setRequestLocale(locale);
    return <NexusPostPage id={id} />;
}
