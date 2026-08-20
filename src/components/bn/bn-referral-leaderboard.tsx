"use client";

// BN referral leaderboard — TOP 10 chaqiruvchi.
// Kabinet MoneyTab'da BnReferralCard'dan keyin ko'rsatiladi (gamification).
// Foydalanuvchini viral ishtirok'ga qiziqtiradi: "Yulduz bo'lish uchun N kishi qoldi".

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy, Crown, Medal, Loader2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { formatMoney } from "@/lib/money";

interface Row {
    rank: number;
    inviterId: string;
    username: string | null;
    humoId: string | null;
    name: string | null;
    image: string | null;
    invited: number;
    earned: number;
}

export function BnReferralLeaderboard() {
    const t = useTranslations("bn.refBoard");
    const [rows, setRows] = useState<Row[] | null>(null);

    useEffect(() => {
        fetch("/api/bn/referral/leaderboard")
            .then(r => r.json())
            .then(d => setRows(d.leaderboard ?? []))
            .catch(() => setRows([]));
    }, []);

    if (rows === null) {
        return (
            <div className="p-6 rounded-2xl grid place-items-center"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.gold }} />
            </div>
        );
    }

    if (rows.length === 0) {
        // Hali hech kim referral qilmagan — motivatsiya
        return (
            <div className="p-5 rounded-2xl"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4" style={{ color: BN.gold }} />
                    <h3 className="text-[14px] font-black">{t("title")}</h3>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>
                    {t("emptyText")}
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            {/* Sarlavha */}
            <div className="flex items-center gap-2 px-4 py-3"
                style={{ background: BN.goldSoft, borderBottom: `1px solid ${BN.border}` }}>
                <Trophy className="w-4 h-4" style={{ color: BN.gold }} />
                <h3 className="text-[13.5px] font-black" style={{ color: BN.gold }}>
                    {t("title")}
                </h3>
                <span className="text-[11px] ml-auto" style={{ color: BN.text3 }}>
                    {t("subtitle")}
                </span>
            </div>

            {/* Ro'yxat */}
            <ol className="divide-y" style={{ borderColor: BN.border }}>
                {rows.map(r => (
                    <li key={r.inviterId}
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ borderColor: BN.border }}>
                        {/* Rank */}
                        <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 text-[12px] font-black tabular-nums"
                            style={r.rank === 1
                                ? { background: BN.goldSoft, color: BN.gold }
                                : r.rank <= 3
                                    ? { background: BN.surfaceUp, color: BN.text2 }
                                    : { background: "transparent", color: BN.text3 }}>
                            {r.rank === 1 ? <Crown className="w-3.5 h-3.5" /> :
                             r.rank <= 3 ? <Medal className="w-3.5 h-3.5" /> :
                             r.rank}
                        </span>

                        {/* Avatar */}
                        <span className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 grid place-items-center"
                            style={{ background: BN.surfaceUp }}>
                            {r.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.image} alt="" loading="lazy"
                                    className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[11px] font-black" style={{ color: BN.text3 }}>
                                    {(r.name || r.username || "?").slice(0, 1).toUpperCase()}
                                </span>
                            )}
                        </span>

                        {/* Ism/username */}
                        <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-bold truncate">
                                {r.name || r.username || r.humoId || "?"}
                            </span>
                            {r.username && (
                                <span className="block text-[10.5px] truncate" style={{ color: BN.text3 }}>
                                    @{r.username}
                                </span>
                            )}
                        </span>

                        {/* Chaqirilganlar soni + summa */}
                        <span className="text-right flex-shrink-0">
                            <span className="block text-[13px] font-black tabular-nums" style={{ color: BN.gold }}>
                                {r.invited}
                            </span>
                            <span className="block text-[10px] tabular-nums" style={{ color: BN.text3 }}>
                                {formatMoney(r.earned, "UZS")}
                            </span>
                        </span>
                    </li>
                ))}
            </ol>

            {/* Motivatsiya footer */}
            <div className="px-4 py-3 text-[11.5px] flex items-center gap-2 justify-between"
                style={{ background: BN.surfaceUp, borderTop: `1px solid ${BN.border}`, color: BN.text3 }}>
                <span>{t("wantIn")}</span>
                <BnLink href="/kabinet" className="font-bold" style={{ color: BN.gold }}>
                    {t("inviteCta")} →
                </BnLink>
            </div>
        </div>
    );
}
