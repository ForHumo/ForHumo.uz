// Belis admin layout — server-side guard.
// Faqat @sevinch va founderlar (abduvoris, aaa) admin sahifalariga kira oladi.
// Qolganlar /kabinet ga yo'naltiriladi.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getBelisAuth } from "@/lib/belis-auth";

const BELIS_HOSTS = new Set(["belis.uz", "www.belis.uz"]);

export default async function BelisAdminLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const ctx = await getBelisAuth();

    // Host'ga qarab toza URL yasaymiz (belis.uz → /uz/kabinet, forhumo → /uz/belis/kabinet)
    const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
    const target = BELIS_HOSTS.has(host) ? `/${locale}/kabinet` : `/${locale}/belis/kabinet`;

    // Kirmagan → kabinet (login CTA chiqadi)
    // Kirgan lekin admin emas → kabinet (jim yo'naltirish, "forbidden" ko'rsatmaymiz)
    if (!ctx || !ctx.isAdmin) redirect(target);

    return <>{children}</>;
}
