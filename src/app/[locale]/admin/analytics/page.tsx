import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireFounder } from "@/lib/admin-guard";
import { HumoFounderAnalytics } from "@/components/admin/humo-founder-analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Founder Analytics — For Humo",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const founder = await requireFounder();
    if (!founder) redirect(`/${locale}/humo`);
    return <HumoFounderAnalytics founderName={founder.name ?? founder.username ?? "Founder"} />;
}
