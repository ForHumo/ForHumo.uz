import { setRequestLocale } from "next-intl/server";
import { AlkhPayContent } from "@/components/pay/alkh-pay-content";

export default async function PayPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <AlkhPayContent />;
}
