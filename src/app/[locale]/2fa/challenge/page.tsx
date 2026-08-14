import { setRequestLocale } from "next-intl/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verify2faToken, TWO_FA_COOKIE_NAME } from "@/lib/2fa-cookie";
import { TwoFaChallenge } from "@/components/security/two-fa-challenge";

export const metadata = { title: "Ikkinchi bosqich | ForHumo.uz" };

export default async function TwoFaChallengePage({ params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ next?: string }>;
}) {
    const { locale } = await params;
    const { next } = await searchParams;
    setRequestLocale(locale);

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect(`/${locale}`);

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, totpEnabled: true, username: true, humoId: true },
    });
    if (!me) redirect(`/${locale}`);

    const dest = next && next.startsWith("/") ? next : `/${locale}/nexus`;

    // 2FA yoqilmagan bo'lsa — challenge kerak emas
    if (!me.totpEnabled) redirect(dest);

    // Allaqachon tasdiqlangan — to'g'ridan-to'g'ri manzilga
    const cookieStore = await cookies();
    const token = cookieStore.get(TWO_FA_COOKIE_NAME)?.value;
    if (verify2faToken(token, me.id)) redirect(dest);

    return <TwoFaChallenge accountName={me.username || me.humoId || session.user.email} nextUrl={dest} />;
}
