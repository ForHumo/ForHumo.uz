import { redirect } from "next/navigation";

// /esport-test endi /esport ga ko'chirildi (premium dizayn asosiy bo'ldi).
// Eski havolalar /esport ga yo'naltiriladi.
export default async function EsportTestLayout({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect(`/${locale}/esport`);
}
