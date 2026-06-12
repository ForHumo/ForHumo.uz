import { setRequestLocale } from "next-intl/server";
import { NexusVerify } from "@/components/nexus/nexus-verify";

export async function generateMetadata() {
    return { title: "Tasdiqlanish | Nexus" };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <NexusVerify />;
}
