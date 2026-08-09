import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AgentCreator } from "@/components/create/agent-creator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agent yaratish | @create" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <AgentCreator />;
}
