"use client";

// BN yutuqlar kartochkasi — kabinet MoneyTab'da.
// Katalogdagi 6 yutuqning har birini ko'rsatadi: olinganlari tilla,
// olinmaganlari qulflangan (kulrang). Progress bor bo'lsa X/N chip.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
    Award, Loader2, Lock, ClipboardList, ShoppingBag, Star, TrendingUp,
    UserPlus, Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Item {
    code: string;
    title: string;
    description: string;
    icon: string;
    tier: "bronze" | "silver" | "gold" | "platinum";
    earnedAt: string | null;
    progress: { current: number; target: number } | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
    ClipboardList, ShoppingBag, Star, TrendingUp, UserPlus, Trophy,
};

const TIER_COLOR: Record<Item["tier"], string> = {
    bronze:   "#CD7F32",
    silver:   "#B4B4B4",
    gold:     "#F5B301",
    platinum: "#7DD3FC",
};

export function BnAchievementsCard() {
    const t = useTranslations("bn.ach");
    const [state, setState] = useState<{ items: Item[]; earnedCount: number; totalCount: number } | null>(null);

    useEffect(() => {
        fetch("/api/bn/achievements")
            .then(r => r.ok ? r.json() : null)
            .then(d => setState(d))
            .catch(() => setState(null));
    }, []);

    if (state === null) {
        return (
            <div className="p-6 rounded-2xl grid place-items-center"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.gold }} />
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            {/* Sarlavha */}
            <div className="flex items-center gap-2 px-4 py-3"
                style={{ background: BN.goldSoft, borderBottom: `1px solid ${BN.border}` }}>
                <Award className="w-4 h-4" style={{ color: BN.gold }} />
                <h3 className="text-[13.5px] font-black" style={{ color: BN.gold }}>
                    {t("title")}
                </h3>
                <span className="text-[11px] ml-auto font-bold tabular-nums" style={{ color: BN.gold }}>
                    {state.earnedCount}/{state.totalCount}
                </span>
            </div>

            {/* Grid */}
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                {state.items.map(item => {
                    const Icon = ICON_MAP[item.icon] ?? Award;
                    const earned = !!item.earnedAt;
                    const tierColor = TIER_COLOR[item.tier];
                    return (
                        <li key={item.code}
                            className="relative p-3 rounded-xl flex flex-col items-center text-center gap-1.5"
                            style={{
                                background: earned ? `${tierColor}14` : BN.surfaceUp,
                                border: `1px solid ${earned ? `${tierColor}44` : BN.border}`,
                                opacity: earned ? 1 : 0.65,
                            }}>
                            <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                                style={{ background: earned ? tierColor : BN.surface, color: earned ? "#000" : BN.text3 }}>
                                {earned
                                    ? <Icon className="w-5 h-5" />
                                    : <Lock className="w-4 h-4" />}
                            </span>
                            <span className="text-[11.5px] font-black leading-tight line-clamp-2">
                                {item.title}
                            </span>
                            <span className="text-[10px] leading-tight line-clamp-2" style={{ color: BN.text3 }}>
                                {item.description}
                            </span>
                            {item.progress && !earned && (
                                <span className="mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums"
                                    style={{ background: BN.surface, color: BN.gold }}>
                                    {item.progress.current}/{item.progress.target}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
