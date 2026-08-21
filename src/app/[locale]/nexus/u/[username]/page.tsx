import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { NexusProfile } from "@/components/nexus/nexus-profile";

// System agent'lar — o'z boshqaruv sahifalariga redirect
const AGENT_REDIRECTS: Record<string, string> = {
    gif: "/nexus/agent/gif",
    sticker: "/nexus/agent/sticker",
};

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    return { title: `@${username} | Nexus` };
}

export default async function Page({ params }: { params: Promise<{ locale: string; username: string }> }) {
    const { locale, username } = await params;
    setRequestLocale(locale);
    const key = username.toLowerCase();
    if (AGENT_REDIRECTS[key]) {
        redirect(`/${locale}${AGENT_REDIRECTS[key]}`);
    }
    return <NexusProfile username={username} />;
}
