import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CheckCircle2, ArrowLeft, LogOut } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return { title: "Email Verification • Humo ID" };
}

export default async function VerifyPage() {
    const session = await getServerSession(authOptions);
    const t = await getTranslations("HumoID");

    const profile = session?.user?.email
        ? await prisma.userProfile.findUnique({
              where: { email: session.user.email },
              select: { emailVerified: true, level: true },
          })
        : null;

    const isVerified = profile?.emailVerified ?? false;

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-16">
            <div className="max-w-sm w-full space-y-6">

                {/* Back */}
                <Link href="/id"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={15} />
                    {t("back_to_id")}
                </Link>

                {isVerified ? (
                    /* ── Already verified ── */
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-4">
                        <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
                        <div>
                            <h1 className="text-xl font-bold text-foreground">{t("already_verified")}</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {session?.user?.email}
                            </p>
                        </div>
                        <Link href="/id"
                            className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-colors">
                            {t("back_to_id")}
                        </Link>
                    </div>
                ) : (
                    /* ── Not yet verified ── */
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 space-y-5">
                        <div>
                            <h1 className="text-xl font-bold text-foreground">{t("verify_title")}</h1>
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                {t("verify_desc")}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {/* Sign out to re-verify */}
                            <form action="/api/auth/signout" method="POST">
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl
                                        bg-amber-500 text-white text-sm font-bold
                                        hover:bg-amber-400 transition-colors"
                                >
                                    <LogOut size={15} />
                                    {t("sign_out_reverify")}
                                </button>
                            </form>

                            <Link href="/id"
                                className="flex items-center justify-center w-full h-11 rounded-xl
                                    border border-border text-sm font-semibold text-muted-foreground
                                    hover:bg-accent transition-colors">
                                {t("back_to_id")}
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
