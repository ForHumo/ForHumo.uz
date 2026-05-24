"use client";

import { useState } from "react";
import { X, Gift, Coins, Star, Zap, Heart, Crown, Rocket, Music, Sparkles, ChevronRight, Check } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface GiftItem {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    coins: number;
    popular: boolean;
    animated: boolean;
}

const GIFTS: GiftItem[] = [
    { id: "g1",  name: "Ko'ngil",   icon: Heart,     color: "#EF4444",  coins: 10,   popular: true,  animated: false },
    { id: "g2",  name: "Yulduz",    icon: Star,       color: "#F59E0B",  coins: 50,   popular: true,  animated: false },
    { id: "g3",  name: "Chaqmoq",   icon: Zap,        color: "#00CEC8",  coins: 100,  popular: false, animated: true  },
    { id: "g4",  name: "Toj",       icon: Crown,      color: "#8B5CF6",  coins: 500,  popular: true,  animated: true  },
    { id: "g5",  name: "Raketa",    icon: Rocket,     color: "#2B3EE8",  coins: 1000, popular: false, animated: true  },
    { id: "g6",  name: "Musiqa",    icon: Music,      color: "#EC4899",  coins: 200,  popular: false, animated: false },
    { id: "g7",  name: "Uchqun",    icon: Sparkles,   color: "#F97316",  coins: 300,  popular: true,  animated: true  },
    { id: "g8",  name: "Sovg'a",    icon: Gift,       color: "#10B981",  coins: 150,  popular: false, animated: false },
];

interface CoinPack { id: string; coins: number; price: string; bonus?: string; popular?: boolean; }
const COIN_PACKS: CoinPack[] = [
    { id: "p1", coins: 100,  price: "5 000 UZS"                                  },
    { id: "p2", coins: 500,  price: "22 000 UZS", bonus: "+50 bonus",             },
    { id: "p3", coins: 1000, price: "40 000 UZS", bonus: "+150 bonus", popular: true },
    { id: "p4", coins: 5000, price: "180 000 UZS",bonus: "+1000 bonus"            },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxGifts
// ─────────────────────────────────────────────────────────────────────────────
export function NxGifts() {
    const { giftsOpen, setGiftsOpen } = useNxPlayer();
    const [tab,        setTab]        = useState<"gifts" | "coins">("gifts");
    const [selected,   setSelected]   = useState<string | null>(null);
    const [qty,        setQty]        = useState(1);
    const [coins,      setCoins]      = useState(2400);
    const [sent,       setSent]       = useState<string | null>(null);

    if (!giftsOpen) return null;

    const selectedGift = GIFTS.find(g => g.id === selected);
    const total = selectedGift ? selectedGift.coins * qty : 0;
    const canSend = !!selectedGift && coins >= total;

    const sendGift = () => {
        if (!canSend) return;
        setCoins(c => c - total);
        setSent(selected);
        setTimeout(() => { setSent(null); setSelected(null); setQty(1); }, 2000);
    };

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setGiftsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70), 0 0 60px rgba(245,158,11,0.06)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}>
                            <Gift className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Virtual sovg'alar</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                Sevimli yaratuvchingizni qo'llab-quvvatlang
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Coin balance */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                            <Coins className="w-3 h-3" style={{ color: "#F59E0B" }} />
                            <span className="text-xs font-black" style={{ color: "#F59E0B" }}>{coins.toLocaleString()}</span>
                        </div>
                        <button onClick={() => setGiftsOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
                    {(["gifts", "coins"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200"
                            style={tab === t ? {
                                background: "linear-gradient(135deg,#F59E0B,#F97316)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>
                            {t === "gifts" ? "Sovg'alar" : "Tangalar sotib olish"}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
                    {tab === "gifts" ? (
                        <>
                            {/* Gift grid */}
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {GIFTS.map(g => {
                                    const Icon = g.icon;
                                    const isSelected = selected === g.id;
                                    return (
                                        <button key={g.id} onClick={() => { setSelected(g.id); setQty(1); }}
                                            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-150 relative"
                                            style={isSelected ? {
                                                background: "rgba(245,158,11,0.15)",
                                                border: "2px solid rgba(245,158,11,0.50)",
                                            } : {
                                                background: "rgba(11,18,40,0.60)",
                                                border: "1px solid rgba(43,62,232,0.14)",
                                            }}>
                                            {g.popular && (
                                                <div className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded-full text-[8px] font-black"
                                                    style={{ background: "#EF4444", color: "white" }}>
                                                    Hot
                                                </div>
                                            )}
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                style={{ background: `${g.color}22` }}>
                                                <Icon className="w-5 h-5" style={{ color: g.color }} />
                                            </div>
                                            <p className="text-[9px] font-bold text-white">{g.name}</p>
                                            <div className="flex items-center gap-0.5">
                                                <Coins className="w-2.5 h-2.5" style={{ color: "#F59E0B" }} />
                                                <span className="text-[9px] font-black" style={{ color: "#F59E0B" }}>
                                                    {g.coins}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Send panel */}
                            {selectedGift && (
                                <div className="p-4 rounded-2xl mb-3"
                                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <selectedGift.icon className="w-5 h-5" style={{ color: selectedGift.color }} />
                                            <span className="text-sm font-bold text-white">{selectedGift.name}</span>
                                        </div>
                                        {/* Qty controls */}
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setQty(q => Math.max(1, q - 1))}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black text-white"
                                                style={{ background: "rgba(43,62,232,0.20)" }}>−</button>
                                            <span className="text-sm font-black text-white w-4 text-center">{qty}</span>
                                            <button onClick={() => setQty(q => Math.min(99, q + 1))}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black text-white"
                                                style={{ background: "rgba(43,62,232,0.20)" }}>+</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Coins className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                                            <span className="text-sm font-black" style={{ color: "#F59E0B" }}>
                                                {total.toLocaleString()} tanga
                                            </span>
                                        </div>
                                        <button onClick={sendGift}
                                            disabled={!canSend}
                                            className="px-4 py-2 rounded-xl font-black text-sm text-white transition-all duration-150 flex items-center gap-1.5"
                                            style={canSend ? {
                                                background: "linear-gradient(135deg,#F59E0B,#F97316)",
                                            } : {
                                                background: "rgba(43,62,232,0.12)",
                                                opacity: 0.5,
                                            }}>
                                            {sent ? <><Check className="w-3.5 h-3.5" /> Yuborildi!</> : <><Gift className="w-3.5 h-3.5" /> Yuborish</>}
                                        </button>
                                    </div>
                                    {!canSend && coins < total && (
                                        <p className="text-[10px] mt-2 text-center" style={{ color: "rgba(239,68,68,0.70)" }}>
                                            Tanga yetarli emas. Yuqoriga to'ldiring.
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Coin packs */
                        <div className="flex flex-col gap-3">
                            <div className="p-3 rounded-2xl flex items-center gap-3"
                                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
                                <Coins className="w-8 h-8 flex-shrink-0" style={{ color: "#F59E0B" }} />
                                <div>
                                    <p className="text-sm font-black text-white">Sizda: {coins.toLocaleString()} tanga</p>
                                    <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                        1 tanga = 50 UZS
                                    </p>
                                </div>
                            </div>

                            {COIN_PACKS.map(pack => (
                                <button key={pack.id}
                                    className="flex items-center gap-3 p-4 rounded-2xl w-full text-left transition-all duration-150 relative"
                                    style={pack.popular ? {
                                        background: "rgba(245,158,11,0.12)",
                                        border: "1px solid rgba(245,158,11,0.40)",
                                    } : {
                                        background: "rgba(11,18,40,0.60)",
                                        border: "1px solid rgba(43,62,232,0.18)",
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,158,11,0.50)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = pack.popular ? "rgba(245,158,11,0.40)" : "rgba(43,62,232,0.18)"}
                                >
                                    {pack.popular && (
                                        <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full text-[9px] font-black"
                                            style={{ background: "#F59E0B", color: "#050818" }}>
                                            Mashhur
                                        </div>
                                    )}
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: "rgba(245,158,11,0.15)" }}>
                                        <Coins className="w-6 h-6" style={{ color: "#F59E0B" }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-base font-black text-white">
                                            {pack.coins.toLocaleString()} tanga
                                        </p>
                                        {pack.bonus && (
                                            <p className="text-[10px] font-bold" style={{ color: "#10B981" }}>{pack.bonus}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-white">{pack.price}</p>
                                        <ChevronRight className="w-4 h-4 ml-auto mt-0.5" style={{ color: "rgba(43,62,232,0.60)" }} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
