"use client";

// BN home hero'da anonim tashrifchiga ko'rinadigan referral CTA.
// Foydalanuvchi kirmagan bo'lsa "Do'st chaqir — 10 000 so'm bonus" kartochkasi;
// bir marta yashirsa keyingi tashriflarda ko'rinmaydi (localStorage).
// Kirgan foydalanuvchi kabinetda to'liq referral kartochkasini ko'radi
// (BnReferralCard) — bu yerda takror qilinmaydi.

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Gift, ArrowRight, X, Users, Coins } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";

const DISMISS_KEY = "bn-refhero-dismissed-v1";

export function BnReferralHero() {
    const t = useTranslations("bn.referralHero");
    const { status } = useSession();
    const [dismissed, setDismissed] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try { setDismissed(!!localStorage.getItem(DISMISS_KEY)); }
        catch { setDismissed(false); }
    }, []);

    if (!mounted) return null;
    if (status !== "unauthenticated") return null;  // kirganda ko'rsatilmaydi
    if (dismissed) return null;

    function dismiss() {
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
        setDismissed(true);
    }

    const inviterBonus = formatMoney(10_000, "UZS");
    const inviteeBonus = formatMoney(5_000, "UZS");

    return (
        <section className="mb-4 sm:mb-5">
            <div
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                {/* Dekorativ gradient — o'ng tomonda tilla nur */}
                <div
                    aria-hidden="true"
                    className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-30 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${BN.gold}66 0%, transparent 70%)` }}
                />

                <button
                    onClick={dismiss}
                    aria-label={t("later")}
                    className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-lg"
                    style={{ color: BN.text3 }}
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                <div className="relative flex items-start gap-3 sm:gap-4">
                    <span
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
                    </span>

                    <div className="flex-1 min-w-0 pr-6">
                        <h3 className="text-[15px] sm:text-[17px] font-black leading-tight tracking-tight">
                            {t("title", { amount: inviterBonus })}
                        </h3>
                        <p className="text-[12px] sm:text-[13px] leading-relaxed mt-1" style={{ color: BN.text2 }}>
                            {t("text", { inviter: inviterBonus, invitee: inviteeBonus })}
                        </p>

                        <div className="flex items-center gap-3 mt-2.5 text-[10.5px] sm:text-[11.5px]" style={{ color: BN.text3 }}>
                            <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{t("stat1")}</span>
                            <span className="inline-flex items-center gap-1"><Coins className="w-3 h-3" />{t("stat2")}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                            <button
                                onClick={() => signIn("google")}
                                className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl text-[13px] sm:text-[13.5px] font-black flex items-center gap-1.5 transition-transform active:scale-[0.97]"
                                style={{ background: BN.gold, color: BN.onGold }}
                            >
                                {t("cta")}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={dismiss}
                                className="h-9 sm:h-10 px-3 rounded-xl text-[12.5px] font-bold"
                                style={{ background: "transparent", color: BN.text3 }}
                            >
                                {t("later")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
