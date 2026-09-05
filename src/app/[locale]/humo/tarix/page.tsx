import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HumoActivityHistory } from "@/components/home/humo-activity-history";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Tarix — Humo",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect(`/${locale}/api/auth/signin?callbackUrl=/${locale}/humo/tarix`);
    return <HumoActivityHistory />;
}
