"use client";

// Admin audit log UI - barcha admin harakatlar bir joyda + rate usage.

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import {
    Shield, Loader2, ArrowLeft, Radio, Ban, XOctagon, ClipboardList, MessageSquare,
    Bot, Zap, TrendingUp,
} from "lucide-react";

interface Audit { id: string; kind: string; actor: string; target?: string; details?: string; at: string }
interface RateUsage {
    ai: {
        totalToday: number;
        byKind: { kind: string; count: number }[];
        topUsers: { actor: string; count: number }[];
    };
    broadcasts: { today: number; dailyLimit: number };
    feedback: { today: number };
    sellerInsights: { today: number };
}

const KIND_META: Record<string, { icon: typeof Radio; color: string; label: string }> = {
    broadcast:   { icon: Radio,         color: "#3b82f6", label: "Broadcast" },
    moderation:  { icon: XOctagon,      color: "#ef4444", label: "Moderatsiya" },
    ban:         { icon: Ban,           color: "#dc2626", label: "Ban" },
    termination: { icon: XOctagon,      color: "#991b1b", label: "Terminate" },
    waitlist:    { icon: ClipboardList, color: "#eab308", label: "Waitlist" },
    feedback:    { icon: MessageSquare, color: "#8b5cf6", label: "Feedback" },
    shop_status: { icon: TrendingUp,    color: "#10b981", label: "Do'kon" },
};

function relTime(iso: string): string {
    const d = Date.now() - new Date(iso).getTime();
    const s = Math.floor(d / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    return `${Math.floor(s / 86400)} kun`;
}

export function HumoAdminAudit() {
    const [audit, setAudit] = useState<Audit[] | null>(null);
    const [usage, setUsage] = useState<RateUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"audit" | "rate">("audit");

    useEffect(() => {
        Promise.all([
            fetch("/api/admin/audit-log?limit=100", { cache: "no-store" }).then(r => r.ok ? r.json() : { items: [] }),
            fetch("/api/admin/rate-usage", { cache: "no-store" }).then(r => r.ok ? r.json() : null),
        ]).then(([a, u]) => {
            setAudit(a.items || []);
            setUsage(u);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="flex items-center gap-3 mb-5">
                    <Link href={"/humo" as never}
                        className="w-10 h-10 rounded-xl grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <span className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)" }}>
                        <Shield className="w-5 h-5 text-white" />
                    </span>
                    <div>
                        <h1 className="text-[22px] font-black leading-tight">Audit & Limits</h1>
                        <p className="text-[13px] text-neutral-500">Founder-only</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 mb-4">
                    <button onClick={() => setTab("audit")}
                        className="h-9 px-3 rounded-lg text-[12.5px] font-black inline-flex items-center gap-1.5"
                        style={{
                            background: tab === "audit" ? "#000" : "transparent",
                            color: tab === "audit" ? "#fff" : "#71717a",
                            border: `1px solid ${tab === "audit" ? "#000" : "#e5e5e5"}`,
                        }}>
                        <Shield className="w-3.5 h-3.5" /> Audit log
                    </button>
                    <button onClick={() => setTab("rate")}
                        className="h-9 px-3 rounded-lg text-[12.5px] font-black inline-flex items-center gap-1.5"
                        style={{
                            background: tab === "rate" ? "#000" : "transparent",
                            color: tab === "rate" ? "#fff" : "#71717a",
                            border: `1px solid ${tab === "rate" ? "#000" : "#e5e5e5"}`,
                        }}>
                        <Zap className="w-3.5 h-3.5" /> Rate usage
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    </div>
                )}

                {!loading && tab === "audit" && audit && (
                    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                        {audit.length === 0 && (
                            <div className="p-8 text-center text-[12.5px] text-neutral-500">Audit yozuv yo'q</div>
                        )}
                        {audit.map(a => {
                            const m = KIND_META[a.kind] || KIND_META.feedback;
                            const Icon = m.icon;
                            return (
                                <div key={a.id} className="flex items-start gap-3 p-3">
                                    <span className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
                                        style={{ background: m.color + "22", color: m.color }}>
                                        <Icon className="w-4 h-4" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-[12.5px] font-black">{m.label}</p>
                                            {a.target && <p className="text-[11.5px] text-neutral-500 truncate">→ {a.target}</p>}
                                        </div>
                                        {a.details && <p className="text-[12px] text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">{a.details}</p>}
                                        <p className="text-[10.5px] text-neutral-400 mt-0.5">
                                            <b>{a.actor}</b> · {relTime(a.at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && tab === "rate" && usage && (
                    <div className="space-y-4">
                        {/* KPI */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <Kpi icon={Bot} label="AI bugun" value={String(usage.ai.totalToday)} color="#8b5cf6" />
                            <Kpi icon={Radio} label="Broadcast" value={`${usage.broadcasts.today}/${usage.broadcasts.dailyLimit}`} color="#3b82f6" />
                            <Kpi icon={MessageSquare} label="Feedback" value={String(usage.feedback.today)} color="#ec4899" />
                            <Kpi icon={TrendingUp} label="AI Insight" value={String(usage.sellerInsights.today)} color="#f5b301" />
                        </div>

                        {/* AI byKind */}
                        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                                <p className="text-[13px] font-black">AI usage kind bo'yicha</p>
                            </div>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {usage.ai.byKind.map(k => {
                                    const maxCount = usage.ai.byKind[0]?.count || 1;
                                    const w = Math.round((k.count / maxCount) * 100);
                                    return (
                                        <div key={k.kind} className="p-2.5">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-[12px] font-bold">{k.kind}</p>
                                                <p className="text-[12px] font-black text-purple-600">{k.count}</p>
                                            </div>
                                            <div className="h-1 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                                <div style={{ width: `${w}%`, height: "100%", background: "#8b5cf6" }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {usage.ai.byKind.length === 0 && (
                                    <div className="p-4 text-center text-[12px] text-neutral-500">Bugun AI ishlatilmagan</div>
                                )}
                            </div>
                        </div>

                        {/* Top users */}
                        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                                <p className="text-[13px] font-black">Bugungi eng faol AI foydalanuvchilar</p>
                            </div>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {usage.ai.topUsers.map((u, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2.5">
                                        <span className="w-6 h-6 rounded grid place-items-center text-[11px] font-black"
                                            style={{ background: i === 0 ? "#8b5cf6" : "#e5e5e5", color: i === 0 ? "#fff" : "#525252" }}>
                                            {i + 1}
                                        </span>
                                        <p className="text-[12.5px] font-bold flex-1 truncate">{u.actor}</p>
                                        <p className="text-[12px] font-black text-purple-600">{u.count} so'rov</p>
                                    </div>
                                ))}
                                {usage.ai.topUsers.length === 0 && (
                                    <div className="p-4 text-center text-[12px] text-neutral-500">Bugun aktivlik yo'q</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Kpi({ icon: Icon, label, value, color }: { icon: typeof Bot; label: string; value: string; color: string }) {
    return (
        <div className="rounded-2xl p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <p className="text-[10.5px] font-black uppercase tracking-wider text-neutral-500">{label}</p>
            </div>
            <p className="text-[18px] font-black leading-tight">{value}</p>
        </div>
    );
}
