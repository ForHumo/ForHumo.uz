"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Copy, Check, Users, TrendingUp, Gift,
    ChevronRight, DollarSign, Share2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
const MY_CODE   = "HUMO-JASUR24";
const MY_LINK   = "nexus.humo.uz/r/jasur24";

interface Referral {
    id: string;
    name: string;
    avatar: string;
    joinedAt: string;
    status: "active" | "inactive";
    earned: number; // UZS
}

const MY_REFERRALS: Referral[] = [
    { id: "rf1", name: "Shahlo M",    avatar: "SM", joinedAt: "3 kun oldin",   status: "active",   earned: 12500 },
    { id: "rf2", name: "Doniyor K",   avatar: "DK", joinedAt: "1 hafta oldin", status: "active",   earned: 12500 },
    { id: "rf3", name: "Malika R",    avatar: "MR", joinedAt: "2 hafta oldin", status: "inactive", earned: 0     },
    { id: "rf4", name: "Botir S",     avatar: "BS", joinedAt: "3 hafta oldin", status: "active",   earned: 12500 },
    { id: "rf5", name: "Nafisa T",    avatar: "NT", joinedAt: "1 oy oldin",    status: "active",   earned: 12500 },
];

const TOTAL_EARNED   = MY_REFERRALS.reduce((s, r) => s + r.earned, 0);
const ACTIVE_COUNT   = MY_REFERRALS.filter(r => r.status === "active").length;
const PENDING_PAYOUT = 37500; // UZS

interface TierInfo {
    min: number; // referrals
    bonus: number; // % bonus on each referral
    label: string;
    color: string;
}

const TIERS: TierInfo[] = [
    { min: 0,  bonus: 0,  label: "Yangi",   color: "#94A3B8" },
    { min: 5,  bonus: 10, label: "Faol",    color: "#10B981" },
    { min: 20, bonus: 25, label: "Elita",   color: "#8B5CF6" },
    { min: 50, bonus: 50, label: "Hamkor",  color: "#F59E0B" },
];

function currentTier(count: number): TierInfo {
    return [...TIERS].reverse().find(t => count >= t.min) ?? TIERS[0];
}
function nextTier(count: number): TierInfo | null {
    return TIERS.find(t => t.min > count) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NxAffiliate
// ─────────────────────────────────────────────────────────────────────────────
export function NxAffiliate() {
    const { affiliateOpen, setAffiliateOpen, setWalletOpen } = useNxPlayer();

    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [tab,        setTab]        = useState<"overview" | "referrals" | "payouts">("overview");

    if (!affiliateOpen) return null;

    const tier = currentTier(MY_REFERRALS.length);
    const next = nextTier(MY_REFERRALS.length);

    const copy = (text: string, which: "code" | "link") => {
        navigator.clipboard?.writeText(text).catch(() => {});
        if (which === "code") { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
        else                  { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    };

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setAffiliateOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Tavsiya dasturi</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>Do'stlarni taklif qiling, daromad oling</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
                {(["overview", "referrals", "payouts"] as const).map(t => {
                    const labels = { overview: "Umumiy", referrals: "Tavsiyalar", payouts: "To'lovlar" };
                    return (
                        <button key={t} onClick={() => setTab(t)}
                            className="flex-1 py-2 text-[11px] font-black rounded-xl transition-all"
                            style={{
                                background: tab === t ? "rgba(43,62,232,0.25)" : "transparent",
                                color: tab === t ? "white" : "rgba(100,120,170,0.60)",
                                border: `1px solid ${tab === t ? "rgba(43,62,232,0.45)" : "transparent"}`,
                            }}>
                            {labels[t]}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 pb-10" style={{ scrollbarWidth: "none" }}>

                {/* ── OVERVIEW ── */}
                {tab === "overview" && (
                    <div className="flex flex-col gap-4">
                        {/* Tier card */}
                        <div className="p-4 rounded-2xl overflow-hidden relative"
                            style={{
                                background: `linear-gradient(135deg, ${tier.color}22 0%, rgba(5,8,24,0.95) 80%)`,
                                border: `1px solid ${tier.color}44`,
                            }}>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1"
                                        style={{ color: `${tier.color}` }}>
                                        Joriy daraja
                                    </p>
                                    <p className="text-xl font-black text-white">{tier.label}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.70)" }}>Bonus</p>
                                    <p className="text-2xl font-black" style={{ color: tier.color }}>
                                        {tier.bonus > 0 ? `+${tier.bonus}%` : "—"}
                                    </p>
                                </div>
                            </div>
                            {next && (
                                <>
                                    <div className="h-1.5 rounded-full overflow-hidden mb-1.5"
                                        style={{ background: "rgba(255,255,255,0.10)" }}>
                                        <div className="h-full rounded-full"
                                            style={{
                                                width: `${(MY_REFERRALS.length / next.min) * 100}%`,
                                                background: tier.color,
                                            }} />
                                    </div>
                                    <p className="text-[9px]" style={{ color: "rgba(140,160,210,0.60)" }}>
                                        {next.min - MY_REFERRALS.length} ta tavsiya kerak → {next.label} darajasi
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Stat row */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "Tavsiyalar",  value: MY_REFERRALS.length,            icon: Users,       color: "#2B3EE8" },
                                { label: "Faol",        value: ACTIVE_COUNT,                    icon: TrendingUp,  color: "#10B981" },
                                { label: "Daromad",     value: `${(TOTAL_EARNED/1000).toFixed(0)}K`, icon: DollarSign, color: "#F59E0B" },
                            ].map((s, i) => {
                                const Icon = s.icon;
                                return (
                                    <div key={i} className="p-3 rounded-2xl text-center"
                                        style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                        <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                                        <p className="text-base font-black text-white">{s.value}</p>
                                        <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.60)" }}>{s.label}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Referral code */}
                        <div className="p-4 rounded-2xl"
                            style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Mening tavsiya kodim
                            </p>
                            {/* Code */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex-1 px-3 py-2.5 rounded-xl text-sm font-black tracking-widest text-white text-center"
                                    style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.30)", letterSpacing: "0.12em" }}>
                                    {MY_CODE}
                                </div>
                                <button onClick={() => copy(MY_CODE, "code")}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                                    style={{ background: copiedCode ? "rgba(16,185,129,0.25)" : "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                    {copiedCode ? <Check className="w-4 h-4" style={{ color: "#10B981" }} /> : <Copy className="w-4 h-4 text-white" />}
                                </button>
                            </div>
                            {/* Link */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-3 py-2.5 rounded-xl text-[11px] text-white truncate"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(140,160,210,0.80)" }}>
                                    {MY_LINK}
                                </div>
                                <button onClick={() => copy(MY_LINK, "link")}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                                    style={{ background: copiedLink ? "rgba(16,185,129,0.25)" : "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                    {copiedLink ? <Check className="w-4 h-4" style={{ color: "#10B981" }} /> : <Share2 className="w-4 h-4 text-white" />}
                                </button>
                            </div>
                        </div>

                        {/* How it works */}
                        <div className="p-4 rounded-2xl"
                            style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.14)" }}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Qanday ishlaydi
                            </p>
                            {[
                                { step: "1", text: "Yuqoridagi kod yoki havolani ulashing" },
                                { step: "2", text: "Do'stingiz Nexus'ga qo'shiladi" },
                                { step: "3", text: "Do'stingiz faol bo'lgach 12,500 so'm olasiz" },
                                { step: "4", text: "Hamyon balansiga o'tkaziladi" },
                            ].map(s => (
                                <div key={s.step} className="flex items-start gap-3 mb-2.5 last:mb-0">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white"
                                        style={{ background: "rgba(43,62,232,0.40)" }}>
                                        {s.step}
                                    </div>
                                    <p className="text-[11px] leading-snug" style={{ color: "rgba(160,176,224,0.80)" }}>
                                        {s.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── REFERRALS ── */}
                {tab === "referrals" && (
                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1"
                            style={{ color: "rgba(100,120,170,0.60)" }}>
                            {MY_REFERRALS.length} ta tavsiya
                        </p>
                        {MY_REFERRALS.map(r => (
                            <div key={r.id} className="flex items-center gap-3 p-3.5 rounded-2xl"
                                style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {r.avatar}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[12px] font-bold text-white">{r.name}</p>
                                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>{r.joinedAt}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black" style={{ color: r.earned > 0 ? "#10B981" : "rgba(100,120,170,0.50)" }}>
                                        {r.earned > 0 ? `+${(r.earned/1000).toFixed(1)}K` : "—"}
                                    </p>
                                    <p className="text-[9px]" style={{ color: r.status === "active" ? "#10B981" : "rgba(100,120,170,0.50)" }}>
                                        {r.status === "active" ? "Faol" : "Faolsiz"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── PAYOUTS ── */}
                {tab === "payouts" && (
                    <div className="flex flex-col gap-4">
                        <div className="p-4 rounded-2xl text-center"
                            style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.20),rgba(0,206,200,0.10))", border: "1px solid rgba(43,62,232,0.30)" }}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1"
                                style={{ color: "rgba(140,160,210,0.70)" }}>
                                Chiqarish mumkin
                            </p>
                            <p className="text-3xl font-black text-white mb-1">
                                {(PENDING_PAYOUT/1000).toFixed(1)}K <span className="text-lg" style={{ color: "rgba(140,160,210,0.70)" }}>so'm</span>
                            </p>
                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>
                                Jami qozonilgan: {(TOTAL_EARNED/1000).toFixed(1)}K so'm
                            </p>
                        </div>

                        <button
                            onClick={() => { setAffiliateOpen(false); setWalletOpen(true); }}
                            className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all duration-150 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Gift className="w-4 h-4" />
                            Hamyonga o'tkazish
                        </button>

                        <div className="p-3 rounded-2xl"
                            style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.14)" }}>
                            <p className="text-[10px] leading-relaxed" style={{ color: "rgba(120,140,190,0.70)" }}>
                                Minimal chiqarish: 10,000 so'm. Tavsiyalar faol bo'lganda avtomatik qo'shiladi.
                                Hamyon orqali bank kartasiga o'tkazish mumkin.
                            </p>
                        </div>

                        {/* Tier bonuses table */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Daraja bonuslari
                            </p>
                            <div className="flex flex-col gap-2">
                                {TIERS.map(t => (
                                    <div key={t.label} className="flex items-center gap-3 p-3 rounded-xl"
                                        style={{
                                            background: tier.label === t.label ? `${t.color}15` : "rgba(8,12,32,0.80)",
                                            border: `1px solid ${tier.label === t.label ? `${t.color}40` : "rgba(43,62,232,0.12)"}`,
                                        }}>
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                                        <span className="text-[11px] font-bold flex-1"
                                            style={{ color: tier.label === t.label ? "white" : "rgba(140,160,210,0.70)" }}>
                                            {t.label}
                                        </span>
                                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>
                                            {t.min}+ tavsiya
                                        </span>
                                        <span className="text-[11px] font-black" style={{ color: t.color }}>
                                            {t.bonus > 0 ? `+${t.bonus}%` : "—"}
                                        </span>
                                        {tier.label === t.label && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                                style={{ background: `${t.color}25`, color: t.color }}>
                                                Siz
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
