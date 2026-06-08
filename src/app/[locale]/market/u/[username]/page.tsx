import { setRequestLocale } from "next-intl/server";
import { PublicProfile } from "@/components/market/public-profile";

export async function generateMetadata() { return { title: "Profil | Humo Market" }; }

export default async function Page({ params }: { params: Promise<{ locale: string; username: string }> }) {
    const { locale, username } = await params;
    setRequestLocale(locale);
    return <PublicProfile username={username} />;
}
