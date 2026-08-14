import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { Fingerprint, LogIn, ArrowRight } from "lucide-react";
import { NexusUsernameGate } from "@/components/nexus/nexus-username-gate";
import { verify2faToken, TWO_FA_COOKIE_NAME } from "@/lib/2fa-cookie";

// Nexus — global header/footer ustini yopadi, o'z to'liq ekran qobig'i bor.
// DARVOZA: Humo Nexus faqat Humo ID + @username olgan foydalanuvchilar uchun.
export default async function NexusLayout({ children, params }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    const session = await getServerSession(authOptions);
    let signedIn = false, hasHumoId = false, username: string | null = null, firstName: string | null = null;
    let profileId: string | null = null;
    let totpEnabled = false;
    if (session?.user?.email) {
        signedIn = true;
        const p = await prisma.userProfile.findUnique({
            where: { email: session.user.email }, select: { id: true, humoId: true, username: true, firstName: true, totpEnabled: true },
        });
        hasHumoId = !!p?.humoId;
        username = p?.username ?? null;
        firstName = p?.firstName ?? null;
        profileId = p?.id ?? null;
        totpEnabled = !!p?.totpEnabled;
    }

    // 2FA gate — TOTP yoqilgan bo'lsa, challenge cookie'siz Nexus'ga kira olmaydi
    if (signedIn && totpEnabled && profileId) {
        const cookieStore = await cookies();
        const token = cookieStore.get(TWO_FA_COOKIE_NAME)?.value;
        if (!verify2faToken(token, profileId)) {
            redirect(`/${locale}/2fa/challenge?next=/${locale}/nexus`);
        }
    }

    // Humo ID bor, lekin username yo'q — Nexus uchun majburiy
    if (hasHumoId && !username) {
        const suggested = (firstName ?? session?.user?.name ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
        return <NexusUsernameGate suggested={suggested.length >= 3 ? suggested : ""} />;
    }

    if (!hasHumoId) {
        return (
            <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-6" style={{ background: "#050818" }}>
                {/* Fon nurlari */}
                <div className="absolute pointer-events-none" style={{ top: "-15%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(43,62,232,0.20) 0%, transparent 70%)" }} />
                <div className="absolute pointer-events-none" style={{ bottom: "-15%", right: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(0,206,200,0.16) 0%, transparent 70%)" }} />

                <div className="relative w-full max-w-md p-8 rounded-3xl text-center" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.28)", backdropFilter: "blur(20px)" }}>
                    <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 32px rgba(43,62,232,0.45)" }}>
                        <Fingerprint className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-black text-white mb-2">
                        Humo Nexus — <span style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Humo ID</span> bilan
                    </h1>
                    <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(150,170,220,0.85)" }}>
                        {signedIn
                            ? "Nexus ijtimoiy tarmog'idan foydalanish uchun Humo ID ro'yxatdan o'tishini yakunlang — bu bir daqiqa vaqt oladi."
                            : "Nexus ijtimoiy tarmog'idan foydalanish uchun avval hisobingizga kiring va Humo ID oling."}
                    </p>
                    <Link href={signedIn ? "/id" : "/"}
                        className="w-full h-12 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.4)" }}>
                        {signedIn ? <><Fingerprint className="w-4 h-4" /> Humo ID olish</> : <><LogIn className="w-4 h-4" /> Kirish</>}
                    </Link>
                    <Link href="/" className="mt-3 inline-flex items-center gap-1 text-xs font-bold transition-colors hover:text-white" style={{ color: "rgba(120,140,190,0.75)" }}>
                        Bosh sahifaga qaytish <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {children}
        </div>
    );
}
