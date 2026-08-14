// Nexus founder-only analytics dashboard.
// Server komponent: sessiya + founder tekshiruvi, keyin client dashboard render qiladi.

import { redirect } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { requireFounder } from "@/lib/admin-guard";
import { NexusAdminDashboard } from "@/components/nexus/nexus-admin-dashboard";

export async function generateMetadata() {
    return { title: "Nexus admin | ForHumo" };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    const founder = await requireFounder();
    if (!founder) redirect({ href: "/nexus", locale });

    return <NexusAdminDashboard />;
}
