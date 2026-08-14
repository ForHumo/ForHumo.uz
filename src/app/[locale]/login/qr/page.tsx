import { setRequestLocale } from "next-intl/server";
import { QrLoginDesktop } from "@/components/security/qr-login-desktop";

export const metadata = { title: "QR bilan kirish | ForHumo.uz" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <QrLoginDesktop locale={locale} />;
}
