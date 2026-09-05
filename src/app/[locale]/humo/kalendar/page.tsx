import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HumoCalendar } from "@/components/home/humo-calendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Kalendar — For Humo",
    robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect(`/${locale}/api/auth/signin?callbackUrl=/${locale}/humo/kalendar`);

    return <HumoCalendar />;
}
