"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Shield, Star, Zap, Crown, Heart, Music, Trophy, Flame, Users, Check } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type BadgeRarity = "common" | "rare" | "epic" | "legendary";

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: typeof Shield;
    color: string;
    rarity: BadgeRarity;
    unlocked: boolean;
    unlockedAt?: string;
    requirement: string;
    displayed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_BADGES: Badge[] = [
    {
        id: "b1", name: "Tasdiqlangan", description: "Rasmiy tasdiqlangan hisob", icon: Check,
        color: "#2B3EE8", rarity: "legendary", unlocked: true, unlockedAt: "2026 Yanvar",
        requirement: "Rasmiy aloqa orqali tasdiqlash", displayed: true,
    },
    {
        id: "b2", name: "Kashshof", description: "Beta foydalanuvchi — platformaga birinchilar qatorida kirgan",
        icon: Zap, color: "#F59E0B", rarity: "legendary", unlocked: true, unlockedAt: "2025 Noyabr",
        requirement: "Beta testga qo'shilish", displayed: true,
    },
    {
        id: "b3", name: "Musiqa Ustasi", description: "1000 ta qo'shiqni tinglash",
        icon: Music, color: "#8B5CF6", rarity: "epic", unlocked: true, unlockedAt: "2026 Fevral",
        requirement: "1000 ta qo'shiqni eshiting", displayed: false,
    },
    {
        id: "b4", name: "Jamoat Yulduz", description: "100 ta obunachi qozonish",
        icon: Users, color: "#10B981", rarity: "rare", unlocked: true, unlockedAt: "2026 Mart",
        requirement: "100 ta obunachi", displayed: false,
    },
    {
        id: "b5", name: "Jonli Efir Qiroli", description: "50 ta jonli efir o'tkazish",
        icon: Flame, color: "#EF4444", rarity: "epic", unlocked: false,
        requirement: "50 ta jonli efir o'tkaz", displayed: false,
    },
    {
        id: "b6", name: "Oltin Yurak", description: "100 ta xayriya hamkorligida ishtirok etish",
        icon: Heart, color: "#F97316", rarity: "rare", unlocked: false,
        requirement: "100 ta xayriyada ishtirok et", displayed: false,
    },
    {
        id: "b7", name: "Chempion", description: "Leaderboard'da top-10 ga kirish",
        icon: Trophy, color: "#EAB308", rarity: "epic", unlocked: false,
        requirement: "Haftalik top-10 ga kir", displayed: false,
    },
    {
        id: "b8", name: "Nexus Pro Homiy", description: "Nexus Pro obunasini 12 oy saqlash",
        icon: Crown, color: "#00CEC8", rarity: "legendary", unlocked: false,
        requirement: "1 yillik Pro obuna", displayed: false,
    },
    {
        id: "b9", name: "Tanqidchi", description: "200 ta izoh qoldirish",
        icon: Star, color: "#6366F1", rarity: "common", unlocked: true, unlockedAt: "2026 Aprel",
        requirement: "200 ta izoh yoz", displayed: false,
    },
    {
        id: "b10", name: "Himoyachi", description: "Jamoat qoidalarini 1 yil buzmaslik",
        icon: Shield, color: "#64748B", rarity: "common", unlocked: true, unlockedAt: "2026 May",
        requirement: "12 oy qoida buzmaslik", displayed: false,
    },
];

const RARITY_STYLE: Record<BadgeRarity, { label: string; bg: string; color: string; glow: string }> = {
    common:    { label: "Oddiy",      bg: "rgba(100,116,139,0.18)", color: "#94A3B8",  glow: "none" },
    rare:      { label: "Noyob",      bg: "rgba(16,185,129,0.18)",  color: "#10B981",  glow: "0 0 12px rgba(16,185,129,0.30)" },
    epic:      { label: "Epik",       bg: "rgba(139,92,246,0.18)",  color: "#8B5CF6",  glow: "0 0 16px rgba(139,92,246,0.40)" },
    legendary: { label: "Afsonaviy",  bg: "rgba(245,158,11,0.18)",  color: "#F59E0B",  glow: "0 0 20px rgba(245,158,11,0.45)" },
};

const MAX_DISPLAYED = 3;

// ─────────────────────────────────────────────────────────────────────────────
// NxBadges
// ─────────────────────────────────────────────────────────────────────────────
export function NxBadges() {
    const { badgesOpen, setBadgesOpen } = useNxPlayer();

    const [badges,  setBadges]  = useState<Badge[]>(MOCK_BADGES);
    const [filter,  setFilter]  = useState<"all" | "unlocked" | "locked">("all");
    const [detail,  setDetail]  = useState<Badge | null>(null);

    if (!badgesOpen) return null;

    const displayedCount = badges.filter(b => b.displayed).length;

    const toggleDisplay = (id: string) => {
        setBadges(prev => prev.map(b => {
            if (b.id !== id) return b;
            if (b.displayed) return { ...b, displayed: false };
            if (displayedCount >= MAX_DISPLAYED) return b; // max reached
            return { ...b, displayed: true };
        }));
    };

    const visible = badges.filter(b =>
        filter === "all" ? true : filter === "unlocked" ? b.unlocked : !b.unlocked
    );

    // ── Badge detail ───────────────────────────────────────────────────────
    if (detail) {
        const Icon   = detail.icon;
        const rarity = RARITY_STYLE[detail.rarity];
        const canDisplay = detail.unlocked && (detail.displayed || displayedCount < MAX_DISPLAYED);

        return (
            <div className="fixed inset-0 z-[120] flex flex-col items-center justify-end"
                style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }}
                onClick={() => setDetail(null)}>
                <div
                    className="w-full max-w-sm rounded-t-3xl p-6 pb-10"
                    style={{ background: "rgba(10,15,40,0.98)", border: "1px solid rgba(43,62,232,0.25)" }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Badge icon */}
                    <div className="flex flex-col items-center mb-5">
                        <div
                            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-3"
                            style={{
                                background: `${detail.color}25`,
                                border: `2px solid ${detail.color}55`,
                                boxShadow: detail.unlocked ? rarity.glow : "none",
                                opacity: detail.unlocked ? 1 : 0.4,
                            }}
                        >
                            <Icon className="w-10 h-10" style={{ color: detail.unlocked ? detail.color : "rgba(100,120,170,0.50)" }} />
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full mb-2"
                            style={{ background: rarity.bg, color: rarity.color }}>
                            {rarity.label}
                        </span>
                        <p className="text-base font-black text-white text-center">{detail.name}</p>
                        <p className="text-[11px] text-center mt-1" style={{ color: "rgba(140,160,210,0.75)" }}>
                            {detail.description}
                        </p>
                    </div>

                    {detail.unlocked && detail.unlockedAt && (
                        <p className="text-center text-[10px] mb-4" style={{ color: "rgba(100,120,170,0.60)" }}>
                            Qozonildi: {detail.unlockedAt}
                        </p>
                    )}

                    {!detail.unlocked && (
                        <div className="mb-4 p-3 rounded-2xl text-center"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                Qozanish sharti: {detail.requirement}
                            </p>
                        </div>
                    )}

                    {detail.unlocked && (
                        <button
                            disabled={!canDisplay && !detail.displayed}
                            onClick={() => { toggleDisplay(detail.id); setDetail(null); }}
                            className="w-full py-3 rounded-2xl text-sm font-black transition-all"
                            style={{
                                background: detail.displayed
                                    ? "rgba(239,68,68,0.12)"
                                    : canDisplay
                                        ? "linear-gradient(135deg,#2B3EE8,#00CEC8)"
                                        : "rgba(43,62,232,0.12)",
                                border: detail.displayed
                                    ? "1px solid rgba(239,68,68,0.25)"
                                    : "none",
                                color: detail.displayed
                                    ? "#EF4444"
                                    : canDisplay ? "white" : "rgba(100,120,170,0.50)",
                            }}>
                            {detail.displayed
                                ? "Profildan olib tashlash"
                                : canDisplay
                                    ? "Profilga qo'yish"
                                    : `Maksimum ${MAX_DISPLAYED} ta (joy yo'q)`
                            }
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── Badge list ─────────────────────────────────────────────────────────
    const unlocked = badges.filter(b => b.unlocked).length;

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setBadgesOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Nishonlar</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                        {unlocked}/{badges.length} qozonildi
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {/* Profile display preview */}
                <div className="px-4 pt-4 pb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                        style={{ color: "rgba(100,120,170,0.60)" }}>
                        Profilda ko'rinayotgan ({displayedCount}/{MAX_DISPLAYED})
                    </p>
                    <div className="flex gap-3 p-3 rounded-2xl"
                        style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        {badges.filter(b => b.displayed).map(b => {
                            const Icon = b.icon;
                            return (
                                <div key={b.id} className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: `${b.color}22`, border: `1px solid ${b.color}44` }}>
                                        <Icon className="w-5 h-5" style={{ color: b.color }} />
                                    </div>
                                    <span className="text-[8px] text-center" style={{ color: "rgba(120,140,190,0.70)" }}>
                                        {b.name}
                                    </span>
                                </div>
                            );
                        })}
                        {Array.from({ length: MAX_DISPLAYED - displayedCount }).map((_, i) => (
                            <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: "rgba(43,62,232,0.06)", border: "1px dashed rgba(43,62,232,0.25)" }}>
                                <span className="text-[10px]" style={{ color: "rgba(43,62,232,0.30)" }}>+</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2 px-4 pb-3">
                    {(["all", "unlocked", "locked"] as const).map(f => {
                        const labels = { all: "Barchasi", unlocked: "Qozonilgan", locked: "Qozonilmagan" };
                        return (
                            <button key={f} onClick={() => setFilter(f)}
                                className="flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all"
                                style={{
                                    background: filter === f ? "rgba(43,62,232,0.25)" : "rgba(43,62,232,0.08)",
                                    border: `1px solid ${filter === f ? "rgba(43,62,232,0.50)" : "rgba(43,62,232,0.14)"}`,
                                    color: filter === f ? "white" : "rgba(100,120,170,0.60)",
                                }}>
                                {labels[f]}
                            </button>
                        );
                    })}
                </div>

                {/* Badge grid */}
                <div className="px-4 pb-8 grid grid-cols-2 gap-3">
                    {visible.map(b => {
                        const Icon   = b.icon;
                        const rarity = RARITY_STYLE[b.rarity];
                        return (
                            <button key={b.id} onClick={() => setDetail(b)}
                                className="p-4 rounded-2xl text-left transition-all active:scale-[0.97]"
                                style={{
                                    background: b.unlocked ? "rgba(8,12,32,0.95)" : "rgba(5,8,24,0.80)",
                                    border: `1px solid ${b.displayed ? `${b.color}55` : "rgba(43,62,232,0.15)"}`,
                                    opacity: b.unlocked ? 1 : 0.55,
                                }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: `${b.color}22`,
                                            border: `1px solid ${b.color}44`,
                                            boxShadow: b.unlocked ? rarity.glow : "none",
                                        }}>
                                        <Icon className="w-5 h-5" style={{ color: b.unlocked ? b.color : "rgba(100,120,170,0.35)" }} />
                                    </div>
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                        style={{ background: rarity.bg, color: rarity.color }}>
                                        {rarity.label}
                                    </span>
                                </div>
                                <p className="text-[12px] font-black text-white leading-tight mb-1">{b.name}</p>
                                <p className="text-[9px] line-clamp-2" style={{ color: "rgba(100,120,170,0.60)" }}>
                                    {b.unlocked ? (b.unlockedAt ? `Qozonildi: ${b.unlockedAt}` : b.description) : b.requirement}
                                </p>
                                {b.displayed && (
                                    <div className="mt-2">
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                                            style={{ background: "rgba(0,206,200,0.18)", color: "#00CEC8" }}>
                                            Profilga qo'yilgan
                                        </span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
