import { setRequestLocale } from "next-intl/server";
import { BanAppealsPanel } from "@/components/admin/ban-appeals-panel";

export async function generateMetadata() { return { title: "Ban arizalari | ForHumo Admin" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <BanAppealsPanel />;
}
