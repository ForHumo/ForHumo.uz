import { setRequestLocale } from "next-intl/server";
import { NexusAnalytics } from "@/components/nexus/nexus-analytics";

export async function generateMetadata() {
    return { title: "Ijodkor analitikasi | Nexus" };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <NexusAnalytics />;
}
