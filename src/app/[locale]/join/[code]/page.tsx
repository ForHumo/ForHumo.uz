// Havola bilan qo'shilish sahifasi (public).
// URL: /join/{code}

import { setRequestLocale } from "next-intl/server";
import { JoinChannelClient } from "@/components/nexus/join-channel-client";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return { title: "Guruhga qo'shilish | ForHumo" };
}

export default async function Page({ params }: { params: Promise<{ locale: string; code: string }> }) {
    const { locale, code } = await params;
    setRequestLocale(locale);
    return <JoinChannelClient code={code} />;
}
