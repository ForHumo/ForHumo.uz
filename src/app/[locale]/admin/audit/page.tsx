import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireFounder } from "@/lib/admin-guard";
import { HumoAdminAudit } from "@/components/admin/humo-admin-audit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Audit log — Admin",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const founder = await requireFounder();
    if (!founder) redirect(`/${locale}/humo`);
    return <HumoAdminAudit />;
}
