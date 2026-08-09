// Brend yaratish endi imkonsiz — Humo Market yagona brend.
import { redirect } from "@/i18n/routing";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect({ href: "/market", locale });
}
