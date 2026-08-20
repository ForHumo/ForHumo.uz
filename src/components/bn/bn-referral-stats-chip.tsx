"use client";

// BN home'da anonim tashrifchiga ko'rinadigan kichkina "N kishi bu hafta
// bonus oldi" chip. Live signal — referral tizimi ishlayapti degan trust.
// BnReferralHero (katta CTA)'dan alohida — bu compact ijtimoiy signal
// (viral loyihalarda "N users joined today" tipida).

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { formatMoney } from "@/lib/money";

interface WeekStats {
    rewardedThisWeek: number;
    totalPaidThisWeek: number;
}

export function BnReferralStatsChip() {
    const t = useTranslations("bn.refChip");
    const [stats, setStats] = useState<WeekStats | null>(null);

    useEffect(() => {
        fetch("/api/bn/referral/leaderboard")
            .then(r => r.ok ? r.json() : null)
            .then(d => setStats(d?.weekStats ?? null))
            .catch(() => setStats(null));
    }, []);

    // Faqat haqiqiy signal bo'lganda ko'rinadi (>= 3 kishi bonus olgan).
    // Aks holda bo'sh signal "0 kishi" negativ ta'sir beradi — jim.
    if (!stats || stats.rewardedThisWeek < 3) return null;

    return (
        <section className="mb-4">
            <BnLink href="/kabinet"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-transform active:scale-[0.99]"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                <span className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}>
                    <Sparkles className="w-4 h-4" />
                </span>
                <p className="flex-1 min-w-0 text-[12.5px] leading-tight">
                    {t.rich("text", {
                        n: stats.rewardedThisWeek,
                        amount: formatMoney(stats.totalPaidThisWeek, "UZS"),
                        b: (chunks) => <b style={{ color: BN.gold }}>{chunks}</b>,
                    })}
                </p>
                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.gold }} />
            </BnLink>
        </section>
    );
}
