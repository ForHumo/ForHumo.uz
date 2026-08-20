// BN referral deep link — bozornarxida.uz/r/<code>
// Bosh sahifaga redirect qiladi, ?ref=<code> bilan (attribution capture ushlaydi).
// Chaqiruvchi profilini oldindan tekshiramiz — mavjud bo'lsa bosh sahifa,
// aks holda ham bosh sahifa (fraud protection uchun invisible).

import { redirect } from "next/navigation";
import { resolveReferralInviter } from "@/lib/bn-referral";

interface PageProps {
    params: Promise<{ locale: string; code: string }>;
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: PageProps) {
    const { locale, code } = await params;
    const normalized = (code || "").trim().toLowerCase().replace(/^@/, "");

    // Kod mavjudmi? — invalid bo'lsa oddiy bosh sahifaga (foydalanuvchi ko'rmaydi)
    const inviter = normalized.length >= 3 ? await resolveReferralInviter(normalized) : null;

    // Bosh sahifaga ?ref bilan
    const target = inviter
        ? `/${locale}/bn?ref=${encodeURIComponent(normalized)}&utm_source=referral&utm_medium=share&utm_campaign=friend_invite`
        : `/${locale}/bn`;

    redirect(target);
}
