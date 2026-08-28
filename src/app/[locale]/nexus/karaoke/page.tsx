import { setRequestLocale } from "next-intl/server";
import { NexusKaraokePage } from "@/components/nexus/nexus-karaoke-page";

export const metadata = { title: "Karaoke | Humo Nexus" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <NexusKaraokePage />;
}
