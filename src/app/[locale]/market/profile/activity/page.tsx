import { setRequestLocale } from "next-intl/server";
import { ProfileActivity } from "@/components/market/profile-activity";

export async function generateMetadata() { return { title: "Faoliyatim | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <ProfileActivity />;
}
