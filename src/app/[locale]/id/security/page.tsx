import { setRequestLocale } from "next-intl/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TwoFaPanel } from "@/components/security/two-fa-panel";
import { DataExportPanel } from "@/components/security/data-export-panel";
import { SessionsPanel } from "@/components/security/sessions-panel";

export const metadata = { title: "Xavfsizlik | Humo ID" };

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect(`/${locale}`);

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { totpEnabled: true, totpEnabledAt: true, username: true, humoId: true, email: true },
    });
    if (!me) redirect(`/${locale}`);

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-black mb-2">Xavfsizlik</h1>
            <p className="text-sm opacity-70 mb-6">Hisobingizni himoya qilish sozlamalari.</p>
            <TwoFaPanel
                enabled={me.totpEnabled}
                enabledAt={me.totpEnabledAt?.toISOString() ?? null}
                accountName={me.username || me.humoId || me.email || "user"}
            />
            <SessionsPanel />
            <DataExportPanel />
        </div>
    );
}
