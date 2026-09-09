import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { HumoTgBotSettings } from "@/components/ai/humo-tg-bot-settings";

export const metadata: Metadata = {
    title: "Humo AI · Telegram Bot",
    description: "Telegram Business akkauntingizga Humo AI'ni ulang — mijoz xabarlariga sizning nomingizdan aqlli avtomatik javob.",
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <HumoTgBotSettings />;
}
