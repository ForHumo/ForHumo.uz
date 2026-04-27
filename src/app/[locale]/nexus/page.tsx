import { setRequestLocale } from 'next-intl/server';
import { NexusContent } from "@/components/nexus/nexus-content";

export default async function NexusPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    return <NexusContent />;
}
