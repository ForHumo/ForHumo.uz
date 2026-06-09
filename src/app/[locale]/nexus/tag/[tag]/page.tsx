import { setRequestLocale } from "next-intl/server";
import { NexusTagFeed } from "@/components/nexus/nexus-tag-feed";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
    const { tag } = await params;
    return { title: `#${decodeURIComponent(tag)} | Nexus` };
}

export default async function Page({ params }: { params: Promise<{ locale: string; tag: string }> }) {
    const { locale, tag } = await params;
    setRequestLocale(locale);
    return <NexusTagFeed tag={decodeURIComponent(tag)} />;
}
