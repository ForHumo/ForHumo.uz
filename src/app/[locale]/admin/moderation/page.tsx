import { setRequestLocale } from "next-intl/server";
import { ModerationQueue } from "@/components/admin/moderation-queue";

export async function generateMetadata() { return { title: "Moderatsiya | ForHumo Admin" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <ModerationQueue />;
}
