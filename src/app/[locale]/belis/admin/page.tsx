import { setRequestLocale } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireBelisAdmin } from "@/lib/belis";
import { BelisAdmin } from "@/components/belis/belis-admin";

export const metadata = { title: "Belis Admin" };

export default async function BelisAdminPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const session = await getServerSession(authOptions);
    const gate = await requireBelisAdmin(session?.user?.email);
    if (!gate.ok) redirect(`/${locale}/belis/kabinet`);
    return <BelisAdmin />;
}
