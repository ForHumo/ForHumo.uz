import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HumoDashboard } from "@/components/home/humo-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Humo — barcha modul bir joyda",
    description: "For Humo super-app dashboard: hamyon, buyurtmalar, DM, tavsiyalar bir sahifada.",
    robots: { index: false, follow: false },
};

export default async function HumoPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect(`/${locale}/api/auth/signin?callbackUrl=/${locale}/humo`);

    return <HumoDashboard />;
}
