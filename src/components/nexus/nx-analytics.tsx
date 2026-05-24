"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, TrendingUp, Eye, Users, Heart, Play,
    DollarSign, BarChart2, ArrowUp, ArrowDown,
    Calendar, ChevronDown, Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock statistika ma'lumotlari
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS = ["7 kun", "30 kun", "3 oy", "1 yil"] as const;
type Period = typeof PERIODS[number];

const STATS: Record<Period, { views: string; subs: string; likes: string; revenue: string; viewsDelta: number; subsDelta: number }> = {
    "7 kun":  { views: "24.5K", subs: "+128",   likes: "3.2K",  revenue: "142,000", viewsDelta: 18,  subsDelta: 34  },
    "30 kun": { views: "98.2K", subs: "+512",   likes: "12.8K", revenue: "568,000", viewsDelta: 24,  subsDelta: 28  },
    "3 oy":   { views: "312K",  subs: "+1.4K",  likes: "41.2K", revenue: "1.82M",   viewsDelta: -5,  subsDelta: 12  },
    "1 yil":  { views: "1.24M", subs: "+5.8K",  likes: "168K",  revenue: "7.45M",   viewsDelta: 82,  subsDelta: 156 },
};

// CSS bar chart uchun mock daily data
const CHART_DATA: Record<Period, number[]> = {
    "7 kun":  [45, 62, 38, 71, 55, 88, 64],
    "30 kun": [30, 45, 55, 40, 60, 70, 50, 80, 65, 45, 55, 70, 60, 75, 55, 40, 65, 80, 70, 55, 40, 60, 75, 85, 65, 50, 40, 55, 70, 88],
    "3 oy":   [40, 55, 65, 45, 70, 60, 50, 75, 80, 60, 45, 55],
    "1 yil":  [30, 40, 35, 50, 45, 60, 55, 70, 65, 80, 75, 88],
};

const TOP_VIDEOS = [
    { title: "React 19 — To'liq Qo'llanma",  views: "84.2K", likes: "4.1K", ctr: "8.4%" },
    { title: "Nexus SDK Arxitekturasi",        views: "61.5K", likes: "3.2K", ctr: "7.1%" },
    { title: "O'zbekiston AI Ekotizimi",       views: "45.8K", likes: "2.8K", ctr: "6.9%" },
    { title: "Musiqa Produksiyasi Asoslari",   views: "38.1K", likes: "2.1K", ctr: "5.8%" },
    { title: "Startup Qurish: 0 dan",          views: "29.4K", likes: "1.9K", ctr: "5.2%" },
];

const AUDIENCE = [
    { label: "18–24 yosh", pct: 38 },
    { label: "25–34 yosh", pct: 31 },
    { label: "35–44 yosh", pct: 18 },
    { label: "45+",        pct: 13 },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxAnalytics
// ─────────────────────────────────────────────────────────────────────────────
export function NxAnalytics() {
    const { analyticsOpen, setAnalyticsOpen } = useNxPlayer();
    const [period, setPeriod] = useState<Period>("30 kun");
    const [tab, setTab] = useState<"overview" | "content" | "audience">("overview");

    if (!analyticsOpen) return null;

    const s    = STATS[period];
    const data = CHART_DATA[period];
    const maxVal = Math.max(...data);

    return (
        <>
            <div className="fixed inset-0 z-[60]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(10px)" }}
                onClick={() => setAnalyticsOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                           md:w-[600px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border:     "1px solid rgba(43,62,232,0.22)",
                    boxShadow:  "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight:  "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <BarChart2 className="w-5 h-5 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                    <div className="flex-1">
                        <h3 className="text-base font-black text-white">Analitika</h3>
                        <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.75)" }}>Kanalingiz statistikasi</p>
                    </div>
                    {/* Period selector */}
                    <div className="relative">
                        <select
                            value={period}
                            onChange={e => setPeriod(e.target.value as Period)}
                            className="appearance-none px-3 py-1.5 pr-7 rounded-xl text-[11px] font-bold text-white outline-none cursor-pointer"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                        >
                            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                            style={{ color: "rgba(140,160,210,0.60)" }} />
                    </div>
                    <button onClick={() => setAnalyticsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-4 py-2 gap-1 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                    {(["overview", "content", "audience"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150"
                            style={tab === t ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff",
                            } : { color: "rgba(120,140,190,0.80)" }}
                        >
                            {t === "overview" ? "Umumiy" : t === "content" ? "Kontentlar" : "Tomoshabinlar"}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "none" }}>

                    {tab === "overview" && (
                        <>
                            {/* KPI kartalar */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {[
                                    { label: "Ko'rishlar",  value: s.views,   icon: Eye,       delta: s.viewsDelta, color: "#2B3EE8" },
                                    { label: "Obunalar",    value: s.subs,    icon: Users,     delta: s.subsDelta,  color: "#10B981" },
                                    { label: "Like",        value: s.likes,   icon: Heart,     delta: 12,           color: "#EF4444" },
                                    { label: "Daromad (so'm)", value: s.revenue, icon: DollarSign, delta: 8,         color: "#F59E0B" },
                                ].map(k => (
                                    <div key={k.label} className="p-4 rounded-2xl"
                                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <k.icon className="w-4 h-4" style={{ color: k.color }} />
                                            <span className={`flex items-center gap-0.5 text-[10px] font-bold ${k.delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                {k.delta >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                                                {Math.abs(k.delta)}%
                                            </span>
                                        </div>
                                        <p className="text-lg font-black text-white">{k.value}</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.75)" }}>{k.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Bar chart */}
                            <div className="p-4 rounded-2xl mb-4"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-4 h-4" style={{ color: "#2B3EE8" }} />
                                    <p className="text-sm font-bold text-white">Ko'rishlar grafigi</p>
                                </div>
                                <div className="flex items-end gap-1 h-28">
                                    {data.map((v, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div
                                                className="w-full rounded-t-sm transition-all duration-500"
                                                style={{
                                                    height: `${(v / maxVal) * 100}%`,
                                                    background: v === maxVal
                                                        ? "linear-gradient(180deg,#2B3EE8,#00CEC8)"
                                                        : "rgba(43,62,232,0.35)",
                                                    minHeight: "4px",
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tezkor statistika */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: "O'rtacha ko'rish vaqti", value: "4:32", icon: Play },
                                    { label: "Bosish nisbati",          value: "6.8%", icon: Zap },
                                    { label: "Obuna/Tark nisbati",      value: "87%",  icon: TrendingUp },
                                ].map(m => (
                                    <div key={m.label} className="p-3 rounded-xl text-center"
                                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                        <m.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: "#2B3EE8" }} />
                                        <p className="text-base font-black text-white">{m.value}</p>
                                        <p className="text-[9px] mt-0.5 leading-tight" style={{ color: "rgba(80,100,150,0.75)" }}>{m.label}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {tab === "content" && (
                        <div className="flex flex-col gap-2">
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(43,62,232,0.55)" }}>
                                Eng Yaxshi Kontentlar
                            </p>
                            {TOP_VIDEOS.map((v, i) => (
                                <div key={v.title} className="flex items-center gap-3 p-3.5 rounded-2xl"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    <span className="text-lg font-black w-6 text-center flex-shrink-0"
                                        style={{ color: i < 3 ? "#F59E0B" : "rgba(80,100,150,0.60)" }}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-white truncate">{v.title}</p>
                                        <div className="flex items-center gap-3 mt-0.5 text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>
                                            <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{v.views}</span>
                                            <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{v.likes}</span>
                                            <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{v.ctr}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: "rgba(43,62,232,0.15)" }}>
                                            <div className="h-full rounded-full"
                                                style={{ width: v.ctr, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                                        </div>
                                        <p className="text-[9px] mt-0.5" style={{ color: "rgba(60,80,120,0.60)" }}>CTR</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === "audience" && (
                        <>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(43,62,232,0.55)" }}>
                                Yosh Tarkibi
                            </p>
                            <div className="flex flex-col gap-2.5 mb-6">
                                {AUDIENCE.map(a => (
                                    <div key={a.label}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-white">{a.label}</span>
                                            <span className="text-xs font-bold" style={{ color: "#00CEC8" }}>{a.pct}%</span>
                                        </div>
                                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(43,62,232,0.15)" }}>
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${a.pct}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(43,62,232,0.55)" }}>
                                Geografiya
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { country: "O'zbekiston",  pct: 68 },
                                    { country: "Rossiya",      pct: 12 },
                                    { country: "Qozog'iston",  pct: 8  },
                                    { country: "Qirg'iziston", pct: 5  },
                                    { country: "Tojikiston",   pct: 4  },
                                    { country: "Boshqalar",    pct: 3  },
                                ].map(g => (
                                    <div key={g.country} className="flex items-center gap-2.5 p-3 rounded-xl"
                                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: "rgba(43,62,232,0.15)" }}>
                                            <Users className="w-4 h-4" style={{ color: "#2B3EE8" }} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-white">{g.country}</p>
                                            <p className="text-[10px]" style={{ color: "#00CEC8" }}>{g.pct}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
