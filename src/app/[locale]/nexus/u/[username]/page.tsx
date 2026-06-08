import { setRequestLocale } from "next-intl/server";
import { NexusProfile } from "@/components/nexus/nexus-profile";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    return { title: `@${username} | Nexus` };
}

export default async function Page({ params }: { params: Promise<{ locale: string; username: string }> }) {
    const { locale, username } = await params;
    setRequestLocale(locale);
    return <NexusProfile username={username} />;
}
