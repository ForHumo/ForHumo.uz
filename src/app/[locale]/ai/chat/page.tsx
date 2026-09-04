import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AiChatPage } from "@/components/ai/ai-chat-page";

export const metadata: Metadata = {
    title: "Humo AI · Chat",
    description: "For Humo AI yordamchisi — barcha modul haqida yordam beradi va sizni yaxshi tanish uchun eslab qoladi.",
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <AiChatPage />;
}
