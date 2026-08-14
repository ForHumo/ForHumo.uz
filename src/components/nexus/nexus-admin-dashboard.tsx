"use client";

// Nexus founder analytics dashboard.
// 4 KPI karta + 30 kunlik chart (SVG stacked bar) + top 10 sender/kanal jadval + moderatsiya karta.
// Barcha ma'lumot GET /api/nexus/admin/analytics dan (founder-gated).

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import {
    Loader2, MessageSquare, Hash, Users, Activity, Shield, Bot as BotIcon,
    ArrowLeft, RefreshCw, ChevronRight, BadgeCheck,
} from "lucide-react";

interface Analytics {
    generatedAt: string;
    dm: { total: number; today: number; week: number; month: number };
    channel: { total: number; today: number; week: number; month: number; activeChannels: number; activeGroups: number };
    users: { active7d: number; active30d: number; newSignups7d: number };
    moderation: { pendingFlags: number; hiddenChanMsg7d: number };
    topSenders7d: Array<{ profileId: string; name: string | null; username: string | null; image: string | null; count: number }>;
    topChannels7d: Array<{ channelId: string; name: string | null; handle: string | null; avatarUrl: string | null; memberCount: number; type: string | null; msgCount: number }>;
    messagesByDay: Array<{ date: string; dm: number; channel: number }>;
}

export function NexusAdminDashboard() {
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function load(showSpinner = true) {
        if (showSpinner) setLoading(true);
        else setRefreshing(true);
        try {
            const r = await fetch("/api/nexus/admin/analytics", { cache: "no-store" });
            if (r.ok) {
                const d = await r.json();
                setData(d);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => { load(true); }, []);

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto"
            style={{ background: "linear-gradient(180deg,#050916 0%,#0A1130 100%)" }}>
            <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Link href="/nexus"
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition"
                            style={{ background: "rgba(43,62,232,0.14)", border: "1px solid rgba(43,62,232,0.28)" }}>
                            <ArrowLeft className="w-4 h-4 text-white" />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                                <Shield className="w-5 h-5" style={{ color: "#00CEC8" }} />
                                Nexus admin
                            </h1>
                            <p className="text-xs" style={{ color: "rgba(140,160,210,0.75)" }}>
                                Faqat founder — foydalanish, moderatsiya, faollik statistikasi
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => load(false)}
                        disabled={refreshing || loading}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition disabled:opacity-40"
                        style={{ background: "rgba(0,206,200,0.14)", border: "1px solid rgba(0,206,200,0.30)" }}
                        title="Yangilash"
                    >
                        {refreshing ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#00CEC8" }} /> : <RefreshCw className="w-4 h-4" style={{ color: "#00CEC8" }} />}
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#00CEC8" }} />
                    </div>
                ) : !data ? (
                    <div className="text-center py-32 text-sm" style={{ color: "rgba(200,210,240,0.75)" }}>
                        Ma&apos;lumotni yuklab bo&apos;lmadi
                    </div>
                ) : (
                    <>
                        {/* 4 KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <KpiCard icon={MessageSquare} label="DM (bugungi)" value={data.dm.today} sub={`${data.dm.week.toLocaleString()} — 7 kun`} color="#2B3EE8" />
                            <KpiCard icon={Hash} label="Kanal (bugungi)" value={data.channel.today} sub={`${data.channel.activeChannels} faol kanal`} color="#00CEC8" />
                            <KpiCard icon={Users} label="Guruh xabari" value={data.channel.week} sub={`${data.channel.activeGroups} faol guruh`} color="#F59E0B" />
                            <KpiCard icon={Activity} label="Faol (7 kun)" value={data.users.active7d} sub={`+${data.users.newSignups7d} yangi`} color="#22C55E" />
                        </div>

                        {/* 30-day chart */}
                        <div className="rounded-2xl p-4 md:p-5 mb-6"
                            style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-black text-white">Xabarlar (30 kun)</h2>
                                <div className="flex items-center gap-3 text-[10px]" style={{ color: "rgba(180,192,224,0.85)" }}>
                                    <LegendItem color="#2B3EE8" label="DM" />
                                    <LegendItem color="#00CEC8" label="Kanal" />
                                </div>
                            </div>
                            <DailyChart data={data.messagesByDay} />
                        </div>

                        {/* Moderatsiya karta */}
                        <div className="rounded-2xl p-4 mb-6 flex items-center gap-4"
                            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(239,68,68,0.14)" }}>
                                <Shield className="w-5 h-5" style={{ color: "#EF4444" }} />
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(180,192,224,0.65)" }}>
                                        Kutayotgan flag
                                    </p>
                                    <p className="text-lg font-black text-white">{data.moderation.pendingFlags}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(180,192,224,0.65)" }}>
                                        Yashirilgan (7 kun)
                                    </p>
                                    <p className="text-lg font-black text-white">{data.moderation.hiddenChanMsg7d}</p>
                                </div>
                            </div>
                            <Link href="/admin/moderation"
                                className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition"
                                style={{ background: "rgba(239,68,68,0.14)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.30)" }}>
                                Moderatsiya <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Top senderlar + kanallar (2 ustun) */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="rounded-2xl p-4"
                                style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                <h2 className="text-sm font-black text-white mb-3">Top 10 yozuvchi (7 kun)</h2>
                                {data.topSenders7d.length === 0 ? (
                                    <p className="text-xs py-4 text-center" style={{ color: "rgba(140,160,210,0.60)" }}>
                                        Ma&apos;lumot yo&apos;q
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {data.topSenders7d.map((s, i) => (
                                            <div key={s.profileId} className="flex items-center gap-2.5 p-2 rounded-lg"
                                                style={{ background: "rgba(43,62,232,0.06)" }}>
                                                <span className="w-5 text-[10px] font-black text-center"
                                                    style={{ color: i < 3 ? "#00CEC8" : "rgba(140,160,210,0.65)" }}>
                                                    {i + 1}
                                                </span>
                                                {s.image ? (
                                                    <Image src={s.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center"
                                                        style={{ background: "rgba(43,62,232,0.24)" }}>
                                                        <BotIcon className="w-3.5 h-3.5" style={{ color: "rgba(160,176,224,0.85)" }} />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">
                                                        {s.name || s.username || "Foydalanuvchi"}
                                                    </p>
                                                    {s.username && (
                                                        <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.65)" }}>
                                                            @{s.username}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs font-black tabular-nums" style={{ color: "#00CEC8" }}>
                                                    {s.count.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl p-4"
                                style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                <h2 className="text-sm font-black text-white mb-3">Top 10 kanal/guruh (7 kun)</h2>
                                {data.topChannels7d.length === 0 ? (
                                    <p className="text-xs py-4 text-center" style={{ color: "rgba(140,160,210,0.60)" }}>
                                        Ma&apos;lumot yo&apos;q
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {data.topChannels7d.map((c, i) => (
                                            <div key={c.channelId} className="flex items-center gap-2.5 p-2 rounded-lg"
                                                style={{ background: "rgba(43,62,232,0.06)" }}>
                                                <span className="w-5 text-[10px] font-black text-center"
                                                    style={{ color: i < 3 ? "#00CEC8" : "rgba(140,160,210,0.65)" }}>
                                                    {i + 1}
                                                </span>
                                                {c.avatarUrl ? (
                                                    <Image src={c.avatarUrl} alt="" width={28} height={28} className="w-7 h-7 rounded-xl object-cover" unoptimized />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                        {c.type === "GROUP" ? <Users className="w-3.5 h-3.5 text-white" /> : <Hash className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                                                        {c.name || "Nomsiz"}
                                                        {c.handle && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                    </p>
                                                    <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.65)" }}>
                                                        {c.handle ? `@${c.handle}` : (c.type === "GROUP" ? "Guruh" : "Kanal")} · {c.memberCount} a&apos;zo
                                                    </p>
                                                </div>
                                                <span className="text-xs font-black tabular-nums" style={{ color: "#00CEC8" }}>
                                                    {c.msgCount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-[10px] mt-6 text-center" style={{ color: "rgba(140,160,210,0.50)" }}>
                            Yangilangan: {new Date(data.generatedAt).toLocaleString("uz-UZ")}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: number; sub: string; color: string }) {
    return (
        <div className="rounded-2xl p-3.5"
            style={{ background: `linear-gradient(135deg, ${color}18, rgba(11,18,40,0.55))`, border: `1px solid ${color}30` }}>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(180,192,224,0.75)" }}>
                    {label}
                </span>
            </div>
            <p className="text-2xl font-black text-white tabular-nums">{value.toLocaleString()}</p>
            <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.65)" }}>{sub}</p>
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            {label}
        </span>
    );
}

function DailyChart({ data }: { data: Array<{ date: string; dm: number; channel: number }> }) {
    // SVG stacked bar chart — dependencies qo'shishdan qochib, o'zimiz chizamiz.
    const W = 800, H = 180;
    const padL = 30, padR = 8, padT = 8, padB = 22;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const n = data.length || 1;
    const barW = chartW / n * 0.72;
    const gap = chartW / n * 0.28;
    const maxVal = Math.max(1, ...data.map(d => d.dm + d.channel));

    // Y ticks — 3 chiziq
    const yTicks = [0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]" preserveAspectRatio="xMidYMid meet">
                {/* Grid chiziqlar */}
                {yTicks.map((tick, i) => {
                    const y = padT + chartH - (tick / maxVal) * chartH;
                    return (
                        <g key={i}>
                            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(43,62,232,0.14)" strokeDasharray="2 4" />
                            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="rgba(140,160,210,0.6)">
                                {tick}
                            </text>
                        </g>
                    );
                })}
                {/* Barlar */}
                {data.map((d, i) => {
                    const x = padL + i * (barW + gap) + gap / 2;
                    const dmH = (d.dm / maxVal) * chartH;
                    const chH = (d.channel / maxVal) * chartH;
                    const yTop = padT + chartH - dmH - chH;
                    return (
                        <g key={d.date}>
                            {chH > 0 && (
                                <rect x={x} y={yTop} width={barW} height={chH} fill="#00CEC8" opacity={0.85} rx="1.5" />
                            )}
                            {dmH > 0 && (
                                <rect x={x} y={yTop + chH} width={barW} height={dmH} fill="#2B3EE8" opacity={0.85} rx="1.5" />
                            )}
                            <title>{`${d.date}: DM ${d.dm}, kanal ${d.channel}`}</title>
                        </g>
                    );
                })}
                {/* X label — birinchi, o'rta, oxirgi kun */}
                {[0, Math.floor(n / 2), n - 1].map(i => {
                    if (i < 0 || i >= n) return null;
                    const d = data[i];
                    if (!d) return null;
                    const x = padL + i * (barW + gap) + gap / 2 + barW / 2;
                    return (
                        <text key={i} x={x} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(140,160,210,0.6)">
                            {d.date.slice(5)}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}
