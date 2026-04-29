import { setRequestLocale } from 'next-intl/server';
import { NexusShell } from "@/components/nexus/nexus-shell";
import { NexusFeed } from "@/components/nexus/nexus-feed";

export default async function NexusPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <NexusShell>
            <NexusFeed />
        </NexusShell>
    );
}
