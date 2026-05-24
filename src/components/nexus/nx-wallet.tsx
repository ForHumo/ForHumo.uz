"use client";

import { useState } from "react";
import {
    X, Wallet, ArrowUpRight, ArrowDownLeft, Plus, QrCode,
    CreditCard, TrendingUp, Gift, Zap, Clock, ChevronRight,
    Star, Copy, Check,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
const TRANSACTIONS = [
    { id:"t1", type:"in",  from:"Islomjon K.",     amount:50000,  desc:"Sovg'a",          time:"Bugun 14:32",     icon: Gift    },
    { id:"t2", type:"out", from:"Nexus Market",    amount:245000, desc:"Kiyim xaridi",    time:"Bugun 11:20",     icon: Star    },
    { id:"t3", type:"in",  from:"Sardor D.",        amount:120000, desc:"To'lov",          time:"Kecha 20:05",     icon: ArrowDownLeft },
    { id:"t4", type:"out", from:"Nexus Pro",        amount:49900,  desc:"Obuna",           time:"Kecha 09:00",     icon: Zap     },
    { id:"t5", type:"in",  from:"Kreator daromad", amount:380000, desc:"Video daromadi",  time:"28 May",          icon: TrendingUp },
    { id:"t6", type:"out", from:"Kamola C.",        amount:80000,  desc:"Transfer",        time:"27 May",          icon: ArrowUpRight },
    { id:"t7", type:"in",  from:"Nexus Cashback",  amount:12500,  desc:"Cashback 5%",     time:"26 May",          icon: Gift    },
];

const QUICK_ACTIONS = [
    { icon: ArrowUpRight,  label: "Yuborish",  color: "#2B3EE8" },
    { icon: ArrowDownLeft, label: "Qabul",     color: "#10B981" },
    { icon: Plus,          label: "To'ldirish",color: "#00CEC8" },
    { icon: QrCode,        label: "QR kod",    color: "#8B5CF6" },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxWallet
// ─────────────────────────────────────────────────────────────────────────────
export function NxWallet() {
    const { walletOpen, setWalletOpen } = useNxPlayer();
    const [copied, setCopied] = useState(false);
    const [tab,    setTab]    = useState<"all" | "in" | "out">("all");

    if (!walletOpen) return null;

    const balance    = 1_245_600;
    const nexusCoins = 3_420;
    const cardNumber = "9860 **** **** 4821";

    const filtered = TRANSACTIONS.filter(t =>
        tab === "all" || t.type === tab
    );

    const copyCard = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setWalletOpen(false)}
            />

            {/* Modal */}
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
                <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-black text-white">Nexus Hamyon</h2>
                    </div>
                    <button
                        onClick={() => setWalletOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Scroll content */}
                <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: "none" }}>
                    {/* Balance card */}
                    <div
                        className="relative p-5 rounded-3xl mb-4 overflow-hidden"
                        style={{
                            background: "linear-gradient(135deg,rgba(43,62,232,0.80),rgba(0,206,200,0.60))",
                            border: "1px solid rgba(43,62,232,0.40)",
                            boxShadow: "0 8px 32px rgba(43,62,232,0.35)",
                        }}
                    >
                        {/* Card pattern */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
                                style={{ background: "rgba(255,255,255,0.08)" }} />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full"
                                style={{ background: "rgba(0,206,200,0.20)" }} />
                        </div>

                        <div className="relative">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Asosiy balans</p>
                            <p className="text-3xl font-black text-white mb-4">
                                {balance.toLocaleString("uz-UZ")} <span className="text-lg opacity-80">so'm</span>
                            </p>

                            {/* Card number */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 opacity-70" />
                                    <span className="text-sm font-mono opacity-85">{cardNumber}</span>
                                </div>
                                <button onClick={copyCard}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90"
                                    style={{ background: "rgba(255,255,255,0.15)" }}>
                                    {copied
                                        ? <Check className="w-3.5 h-3.5 text-white" />
                                        : <Copy  className="w-3.5 h-3.5 text-white" />
                                    }
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Nexus Coins */}
                    <div className="flex items-center gap-3 p-4 rounded-2xl mb-4"
                        style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
                            <Star className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-black text-white">Nexus Coins</p>
                            <p className="text-[10px]" style={{ color: "rgba(245,158,11,0.80)" }}>
                                Sovg'a va mukofot uchun ishlatish
                            </p>
                        </div>
                        <span className="text-xl font-black" style={{ color: "#F59E0B" }}>
                            {nexusCoins.toLocaleString()}
                        </span>
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-4 gap-3 mb-5">
                        {QUICK_ACTIONS.map(({ icon: Icon, label, color }, i) => (
                            <button key={i} className="flex flex-col items-center gap-2 group">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group-active:scale-90"
                                    style={{ background: `rgba(${color === "#2B3EE8" ? "43,62,232" : color === "#10B981" ? "16,185,129" : color === "#00CEC8" ? "0,206,200" : "139,92,246"},0.15)`, border: `1px solid ${color}40` }}
                                >
                                    <Icon className="w-5 h-5" style={{ color }} />
                                </div>
                                <span className="text-[9px] font-bold" style={{ color: "rgba(120,140,190,0.85)" }}>{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Transactions */}
                    <div className="mb-6">
                        {/* Filter tabs */}
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-black uppercase tracking-widest"
                                style={{ color: "rgba(43,62,232,0.55)" }}>Harakatlar</p>
                            <div className="flex gap-1.5">
                                {(["all", "in", "out"] as const).map(t => (
                                    <button key={t}
                                        onClick={() => setTab(t)}
                                        className="px-2.5 py-1 rounded-lg text-[9px] font-black transition-all duration-200"
                                        style={tab === t ? {
                                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                            color: "white",
                                        } : {
                                            background: "rgba(43,62,232,0.10)",
                                            color: "rgba(140,160,210,0.80)",
                                        }}
                                    >
                                        {t === "all" ? "Barchasi" : t === "in" ? "Kirdi" : "Chiqdi"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            {filtered.map(tx => (
                                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl group"
                                    style={{ border: "1px solid transparent" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.16)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "transparent"}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: tx.type === "in"
                                                ? "rgba(16,185,129,0.15)"
                                                : "rgba(239,68,68,0.12)",
                                            border: `1px solid ${tx.type === "in" ? "rgba(16,185,129,0.30)" : "rgba(239,68,68,0.25)"}`,
                                        }}>
                                        <tx.icon className="w-4.5 h-4.5" style={{ color: tx.type === "in" ? "#10B981" : "#EF4444", width: "18px", height: "18px" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{tx.from}</p>
                                        <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>{tx.desc} · {tx.time}</p>
                                    </div>
                                    <p className="text-sm font-black flex-shrink-0"
                                        style={{ color: tx.type === "in" ? "#10B981" : "#EF4444" }}>
                                        {tx.type === "in" ? "+" : "-"}{tx.amount.toLocaleString()} so'm
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="px-5 pb-6 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                    <button
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-sm font-bold text-white mt-4 transition-all duration-150 active:scale-95"
                        style={{
                            background: "linear-gradient(135deg,#10B981,#0D9488)",
                            boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Hamyonni to'ldirish
                    </button>
                </div>
            </div>
        </>
    );
}
