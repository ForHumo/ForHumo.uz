import { setRequestLocale } from "next-intl/server";
import { YukGoAdmin } from "@/components/yukgo/yukgo-admin";

export async function generateMetadata() {
    return { title: "YukGo — Statistika", robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <YukGoAdmin />;
}
