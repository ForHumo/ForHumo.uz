"use client";

import { useState } from "react";
import { X, Zap, Send, Crown, Star, TrendingUp } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Superchats are highlighted paid messages in live streams
// ─────────────────────────────────────────────────────────────────────────────
interface SuperTier {
    id: string;
    label: string;
    coins: number;
    duration: string;   // how long message stays pinned
    color: string;
    textColor: string;
    icon: React.ElementType;
}

const TIERS: SuperTier[] = [
    { id: "t1", label: "Ko'k",     coins: 50,   duration: "30 soniya", color: "#1E40AF", textColor: "white", icon: Zap   },
    { id: "t2", label: "Yashil",   coins: 100,  duration: "2 daqiqa",  color: "#065F46", textColor: "white", icon: Zap   },
    { id: "t3", label: "Sariq",    coins: 300,  duration: "5 daqiqa",  color: "#92400E", textColor: "white", icon: Star  },
    { id: "t4", label: "Limon",    coins: 500,  duration: "10 daqiqa", color: "#854D0E", textColor: "white", icon: Star  },
    { id: "t5", label: "Naranja",  coins: 1000, duration: "30 daqiqa", color: "#9A3412", textColor: "white", icon: Crown },
    { id: "t6", label: "Qizil",    coins: 2000, duration: "1 soat",    color: "#7F1D1D", textColor: "#FFD700", icon: Crown },
];

const TIER_COLORS = {
    t1: "#3B82F6", t2: "#10B981", t3: "#F59E0B", t4: "#EAB308", t5: "#F97316", t6: "#EF4444",
} as const;

interface RecentSuperChat {
    user: string;
    avatar: string;
    tier: string;
    coins: number;
    message: string;
    color: string;
}

const RECENT: RecentSuperChat[] = [
    { user: "Jasur.Dev",     avatar: "https://picsum.photos/seed/sc1/40/40", tier: "t6", coins: 2000, message: "Zo'r efir! Har doim qo'llab-quvvatlayman!", color: TIER_COLORS.t6 },
    { user: "MusiQfan_UZ",   avatar: "https://picsum.photos/seed/sc2/40/40", tier: "t5", coins: 1000, message: "Yangi qo'shiq qachon chiqadi?",             color: TIER_COLORS.t5 },
    { user: "TechLover22",   avatar: "https://picsum.photos/seed/sc3/40/40", tier: "t4", coins: 500,  message: "Ajoyib kontent! Davom eting!",               color: TIER_COLORS.t4 },
    { user: "Nodira_XO",     avatar: "https://picsum.photos/seed/sc4/40/40", tier: "t3", coins: 300,  message: "Siz mening sevimli yaratuvchimsiiz!",         color: TIER_COLORS.t3 },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxSuperChat
// ─────────────────────────────────────────────────────────────────────────────
export function NxSuperChat() {
    const { superChatOpen, setSuperChatOpen } = useNxPlayer();
    const [selectedTier, setSelectedTier] = useState<SuperTier>(TIERS[2]);
    const [message, setMessage] = useState("");
    const [coins] = useState(2400);
    const [sent, setSent] = useState(false);
    const MAX_MSG = 150;

    const canSend = coins >= selectedTier.coins && message.trim().length > 0;

    const send = () => {
        if (!canSend) return;
        setSent(true);
        setTimeout(() => {
            setSent(false);
            setMessage("");
            setSuperChatOpen(false);
        }, 2000);
    };

    if (!superChatOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[58]"
                style={{ background: "rgba(5,8,24,0.82)", backdropFilter: "blur(10px)" }}
                onClick={() => setSuperChatOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[58] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Super Chat</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                Hamyon: {coins.toLocaleString()} tanga
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setSuperChatOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {/* Tier selector */}
                    <div className="px-5 pb-4">
                        <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(80,100,150,0.70)" }}>
                            Darajani tanlang
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {TIERS.map(t => {
                                const color = TIER_COLORS[t.id as keyof typeof TIER_COLORS];
                                const TIcon = t.icon;
                                const isSelected = selectedTier.id === t.id;
                                return (
                                    <button key={t.id} onClick={() => setSelectedTier(t)}
                                        className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-all duration-200"
                                        style={{
                                            background: isSelected ? `${color}25` : "rgba(11,18,40,0.60)",
                                            border: `1px solid ${isSelected ? color : "rgba(43,62,232,0.14)"}`,
                                            outline: isSelected ? `2px solid ${color}` : "none",
                                            outlineOffset: 1,
                                        }}>
                                        <TIcon className="w-4 h-4" style={{ color }} />
                                        <span className="text-[10px] font-black text-white">{t.coins}</span>
                                        <span className="text-[8px] font-bold" style={{ color: "rgba(140,160,210,0.70)" }}>
                                            {t.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected tier info */}
                    <div className="px-5 pb-4">
                        <div className="flex items-center gap-2 p-3 rounded-xl"
                            style={{
                                background: `${TIER_COLORS[selectedTier.id as keyof typeof TIER_COLORS]}15`,
                                border: `1px solid ${TIER_COLORS[selectedTier.id as keyof typeof TIER_COLORS]}35`,
                            }}>
                            <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: TIER_COLORS[selectedTier.id as keyof typeof TIER_COLORS] }} />
                            <div>
                                <p className="text-xs font-bold text-white">
                                    {selectedTier.coins} tanga — {selectedTier.label} darajasi
                                </p>
                                <p className="text-[9px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                    Xabaringiz {selectedTier.duration} davomida chatda ko'rinadi
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Message input */}
                    <div className="px-5 pb-4">
                        <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(80,100,150,0.70)" }}>
                            Xabaringiz
                        </p>
                        <div className="rounded-xl overflow-hidden"
                            style={{
                                background: "rgba(11,18,40,0.60)",
                                border: `1px solid ${TIER_COLORS[selectedTier.id as keyof typeof TIER_COLORS]}40`,
                            }}>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value.slice(0, MAX_MSG))}
                                placeholder="Yaratuvchiga xabar yozing..."
                                rows={3}
                                className="w-full bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.50)] px-3 pt-3 outline-none resize-none"
                            />
                            <div className="flex justify-end px-3 pb-2">
                                <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.50)" }}>
                                    {message.length}/{MAX_MSG}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Send button */}
                    <div className="px-5 pb-4">
                        <button
                            onClick={send}
                            disabled={!canSend && !sent}
                            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all duration-200"
                            style={sent ? {
                                background: "linear-gradient(135deg,#10B981,#059669)",
                                color: "white",
                            } : canSend ? {
                                background: `linear-gradient(135deg,${TIER_COLORS[selectedTier.id as keyof typeof TIER_COLORS]},#EF4444)`,
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                color: "rgba(140,160,210,0.40)",
                                border: "1px solid rgba(43,62,232,0.15)",
                            }}>
                            {sent ? (
                                "Yuborildi!"
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    {selectedTier.coins} tanga bilan yuborish
                                </>
                            )}
                        </button>
                        {coins < selectedTier.coins && (
                            <p className="text-center text-[9px] mt-2" style={{ color: "#EF4444" }}>
                                Yetarli tanga yo'q. Hamyonni to'ldiring.
                            </p>
                        )}
                    </div>

                    {/* Recent super chats */}
                    <div className="px-5 pb-6">
                        <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(80,100,150,0.70)" }}>
                            So'nggi super chatlar
                        </p>
                        <div className="flex flex-col gap-2">
                            {RECENT.map((sc, i) => (
                                <div key={i}
                                    className="flex items-start gap-2.5 p-2.5 rounded-xl"
                                    style={{ background: `${sc.color}15`, border: `1px solid ${sc.color}30` }}>
                                    <img src={sc.avatar} alt={sc.user}
                                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-xs font-bold" style={{ color: sc.color }}>{sc.user}</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                                                style={{ background: `${sc.color}25`, color: sc.color }}>
                                                {sc.coins} tanga
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/80 leading-snug">{sc.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
