"use client";

import { useState } from "react";
import { X, Trophy, Star, Zap, Heart, Play, Users, Music2, Film, Mic2, Crown, Lock } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock achievements
// ─────────────────────────────────────────────────────────────────────────────
interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    xp: number;
    unlocked: boolean;
    progress?: number;   // 0-100 if in progress
    unlockedAt?: string;
}

const ACHIEVEMENTS: Achievement[] = [
    { id: "a1",  title: "Birinchi qadam",     description: "Profilni to'ldiring",              icon: Star,    color: "#F59E0B", xp: 50,   unlocked: true,  unlockedAt: "2025-01-15" },
    { id: "a2",  title: "Musiqa sevgisi",      description: "100 ta qo'shiq tinglang",          icon: Music2,  color: "#10B981", xp: 100,  unlocked: true,  unlockedAt: "2025-01-22" },
    { id: "a3",  title: "Video maniyak",       description: "50 ta video ko'ring",              icon: Film,    color: "#2B3EE8", xp: 150,  unlocked: true,  unlockedAt: "2025-02-01" },
    { id: "a4",  title: "Ijtimoiy mavjudot",   description: "10 ta do'st toping",              icon: Users,   color: "#8B5CF6", xp: 200,  unlocked: true,  unlockedAt: "2025-02-14" },
    { id: "a5",  title: "Jonli efir shahidi",  description: "5 ta jonli efirda ishtirok eting", icon: Play,    color: "#EF4444", xp: 250,  unlocked: false, progress: 60 },
    { id: "a6",  title: "Podkast tinglovchi",  description: "20 ta podkast tinglang",           icon: Mic2,    color: "#F97316", xp: 180,  unlocked: false, progress: 35 },
    { id: "a7",  title: "Super faol",          description: "30 kun ketma-ket kiring",          icon: Zap,     color: "#FBBF24", xp: 500,  unlocked: false, progress: 73 },
    { id: "a8",  title: "Mehribon qalb",       description: "500 ta like bering",              icon: Heart,   color: "#EC4899", xp: 300,  unlocked: false, progress: 48 },
    { id: "a9",  title: "Yaratuvchi yulduz",   description: "1000 ta obunachi to'plang",       icon: Crown,   color: "#EF4444", xp: 1000, unlocked: false, progress: 0  },
    { id: "a10", title: "Legenda",             description: "1M ta ko'rish oling",             icon: Trophy,  color: "#F59E0B", xp: 5000, unlocked: false, progress: 0  },
];

const TOTAL_XP = ACHIEVEMENTS.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);
const LEVEL = Math.floor(TOTAL_XP / 300) + 1;
const LEVEL_XP_REQUIRED = LEVEL * 300;
const LEVEL_PROGRESS = (TOTAL_XP % 300) / 300 * 100;

// ─────────────────────────────────────────────────────────────────────────────
// NxAchievements
// ─────────────────────────────────────────────────────────────────────────────
export function NxAchievements() {
    const { achievementsOpen, setAchievementsOpen } = useNxPlayer();
    const [filter,   setFilter]   = useState<"all" | "unlocked" | "locked">("all");
    const [expanded, setExpanded] = useState<string | null>(null);

    const filtered = ACHIEVEMENTS.filter(a =>
        filter === "all" ? true : filter === "unlocked" ? a.unlocked : !a.unlocked
    );

    if (!achievementsOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setAchievementsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[460px] md:max-h-[90vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "92vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}>
                            <Trophy className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Yutuqlar</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                {ACHIEVEMENTS.filter(a => a.unlocked).length}/{ACHIEVEMENTS.length} ta ochilgan · {TOTAL_XP} XP
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setAchievementsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Level card */}
                <div className="px-5 pb-4 flex-shrink-0">
                    <div className="p-4 rounded-2xl"
                        style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.20),rgba(139,92,246,0.15))", border: "1px solid rgba(43,62,232,0.30)" }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                                    <Crown className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-base font-black text-white">{LEVEL}-daraja</p>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                        {TOTAL_XP} / {LEVEL_XP_REQUIRED} XP
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold" style={{ color: "#F59E0B" }}>
                                    {ACHIEVEMENTS.filter(a => a.unlocked).length} yutuq
                                </p>
                            </div>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.10)" }}>
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${LEVEL_PROGRESS}%`,
                                    background: "linear-gradient(90deg,#F59E0B,#EF4444)",
                                }} />
                        </div>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
                    {([["all", "Barchasi"], ["unlocked", "Ochilgan"], ["locked", "Qolgan"]] as const).map(([key, label]) => (
                        <button key={key} onClick={() => setFilter(key)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                            style={filter === key ? {
                                background: "linear-gradient(135deg,#F59E0B,#F97316)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Achievement list */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                <Lock className="w-6 h-6" style={{ color: "rgba(43,62,232,0.45)" }} />
                            </div>
                            <p className="text-sm font-bold text-white">Nishon topilmadi</p>
                            <p className="text-[11px] text-center" style={{ color: "rgba(80,100,150,0.70)" }}>
                                Boshqa filtr tanlang
                            </p>
                        </div>
                    )}
                    <div className="flex flex-col gap-3">
                        {filtered.map(a => {
                            const AIcon = a.icon;
                            const isExpanded = expanded === a.id;
                            return (
                                <button key={a.id}
                                    onClick={() => setExpanded(isExpanded ? null : a.id)}
                                    className="flex flex-col gap-0 rounded-2xl transition-all duration-200 text-left w-full"
                                    style={{
                                        background: a.unlocked ? "rgba(11,18,40,0.80)" : "rgba(11,18,40,0.40)",
                                        border: `1px solid ${isExpanded ? `${a.color}60` : a.unlocked ? `${a.color}30` : "rgba(43,62,232,0.10)"}`,
                                        opacity: a.unlocked ? 1 : 0.75,
                                        boxShadow: isExpanded ? `0 0 16px ${a.color}20` : "none",
                                    }}
                                >
                                <div className="flex items-center gap-3 p-3">
                                    {/* Icon */}
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                                        style={{
                                            background: a.unlocked ? `${a.color}20` : "rgba(43,62,232,0.08)",
                                            border: `1px solid ${a.unlocked ? `${a.color}40` : "rgba(43,62,232,0.15)"}`,
                                        }}>
                                        {a.unlocked ? (
                                            <AIcon className="w-5 h-5" style={{ color: a.color }} />
                                        ) : (
                                            <Lock className="w-4 h-4" style={{ color: "rgba(80,100,150,0.50)" }} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <p className="text-sm font-black text-white truncate">{a.title}</p>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black flex-shrink-0"
                                                style={{
                                                    background: a.unlocked ? `${a.color}20` : "rgba(43,62,232,0.10)",
                                                    color: a.unlocked ? a.color : "rgba(80,100,150,0.60)",
                                                }}>
                                                +{a.xp} XP
                                            </span>
                                        </div>
                                        <p className="text-[10px] mb-1.5" style={{ color: "rgba(80,100,150,0.75)" }}>
                                            {a.description}
                                        </p>
                                        {!a.unlocked && a.progress !== undefined && a.progress > 0 && (
                                            <div className="w-full h-1.5 rounded-full overflow-hidden"
                                                style={{ background: "rgba(43,62,232,0.15)" }}>
                                                <div className="h-full rounded-full"
                                                    style={{
                                                        width: `${a.progress}%`,
                                                        background: `linear-gradient(90deg,${a.color},${a.color}80)`,
                                                    }} />
                                            </div>
                                        )}
                                        {a.unlocked && a.unlockedAt && (
                                            <p className="text-[9px]" style={{ color: `${a.color}80` }}>
                                                {a.unlockedAt} da olindi
                                            </p>
                                        )}
                                    </div>

                                    {/* Check or progress */}
                                    {a.unlocked ? (
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${a.color}25` }}>
                                            <Star className="w-3 h-3 fill-current" style={{ color: a.color }} />
                                        </div>
                                    ) : a.progress !== undefined ? (
                                        <span className="text-xs font-black flex-shrink-0"
                                            style={{ color: "rgba(80,100,150,0.60)" }}>
                                            {a.progress}%
                                        </span>
                                    ) : null}
                                </div>
                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="px-3 pb-3 border-t"
                                        style={{ borderColor: `${a.color}20` }}>
                                        <p className="text-[11px] mt-2 leading-relaxed"
                                            style={{ color: "rgba(140,160,210,0.80)" }}>
                                            {a.unlocked
                                                ? `Bu nishon ${a.unlockedAt ?? "oldin"} da olindi. Siz +${a.xp} XP yig'indingiz.`
                                                : `Bu nishonni qo'lga kiritish uchun ${a.progress !== undefined ? `${a.progress}% bajarildi` : "shartlarni bajaring"}.`}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                                                style={{ background: `${a.color}20`, color: a.color }}>
                                                +{a.xp} XP
                                            </span>
                                            <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.60)" }}>
                                                Oddiy daraja
                                            </span>
                                        </div>
                                    </div>
                                )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
