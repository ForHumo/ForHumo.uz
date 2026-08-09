// Eski marshrut — endi Owner/Worker'lar uchun /market/admin/dashboard ga o'tadi.
import { redirect } from "@/i18n/routing";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect({ href: "/market/admin/dashboard", locale });
}
