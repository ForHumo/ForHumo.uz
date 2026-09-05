"use client";

// Founder cross-modul dashboard. Katta rasm — barcha modul KPI, trend, top ro'yxatlar.

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import {
    Users, ShoppingCart, Store, Package, MessageCircle,
    Calendar, LifeBuoy, TrendingUp, Loader2, ArrowRight,
    Trophy, Bot, AlertTriangle, Wallet,
} from "lucide-react";

interface TopShop { shopId: string; slug: string; name: string; orderCount: number; rating: number; ratingCount: number; tier: string }
interface TopProduct { productId: string; title: string; slug?: string; imageUrl: string | null; price: number; shopName: string; soldQty: number }
interface TopSeller { shopId: string; name: string; slug?: string; tier?: string; orders: number; revenue: number }
interface Trend { day: string; users: number; bnOrders: number; posts: number }

interface Resp {
    period: { days: number; from: string; to: string };
    users: { total: number; new: number; active: number };
    nexus: { totalPosts: number; newPosts: number; totalDM: number; newDM: number };
    bn: {
        totalShops: number; approvedShops: number; pendingShops: number;
        totalOrders: number; newOrders: number;
        monthRevenue: number; monthCommission: number;
        waitlist: number; urgentWaitlist: number;
    };
    belis: { totalBookings: number; newBookings: number };
    market: { totalOrders: number; newOrders: number };
    support: { open: number; new: number; aiHandled: number };
    wallet: { totalWallets: number; monthDeposits: number };
    topShops: TopShop[];
    topProducts: TopProduct[];
    topSellers: TopSeller[];
    trend: Trend[];
}

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }
function fmtShort(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return String(n);
}

export function HumoFounderAnalytics({ founderName }: { founderName: string }) {
    const [days, setDays] = useState(7);
    const [data, setData] = useState<Resp | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/humo-analytics?days=${days}`, { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(j => setData(j))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [days]);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Sarlavha */}
                <div className="flex items-start gap-3 mb-5">
                    <span className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)" }}>
                        <TrendingUp className="w-5 h-5 text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-black">Founder</p>
                        <h1 className="text-[24px] font-black leading-tight">For Humo Analytics</h1>
                        <p className="text-[13px] text-neutral-500 mt-0.5">{founderName} · cross-modul katta rasm</p>
                    </div>
                    <Link href={"/humo" as never}
                        className="h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-[13px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 flex-shrink-0 border border-neutral-200 dark:border-neutral-800">
                        <ArrowRight className="w-4 h-4 rotate-180" /> Panel
                    </Link>
                </div>

                {/* Davr tanlash */}
                <div className="flex items-center gap-1.5 mb-5">
                    {[{ d: 1, l: "Bugun" }, { d: 7, l: "7 kun" }, { d: 30, l: "30 kun" }].map(x => (
                        <button key={x.d} onClick={() => setDays(x.d)}
                            className="h-9 px-3 rounded-lg text-[12.5px] font-black transition"
                            style={{
                                background: days === x.d ? "#000" : "transparent",
                                color: days === x.d ? "#fff" : "#71717a",
                                border: `1px solid ${days === x.d ? "#000" : "#e5e5e5"}`,
                            }}>
                            {x.l}
                        </button>
                    ))}
                </div>

                {loading && !data && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    </div>
                )}

                {data && (
                    <>
                        {/* URGENT alert */}
                        {(data.bn.urgentWaitlist > 0 || data.bn.pendingShops > 0 || data.support.open > 5) && (
                            <div className="rounded-2xl p-4 mb-5 flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-300">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13.5px] font-black text-red-700 dark:text-red-400">Diqqat talab qiladi</p>
                                    <ul className="text-[12px] text-red-700 dark:text-red-400 mt-1 space-y-0.5">
                                        {data.bn.urgentWaitlist > 0 && <li>· {data.bn.urgentWaitlist} sotuvchi 3+ kun kutmoqda (waitlist)</li>}
                                        {data.bn.pendingShops > 0 && <li>· {data.bn.pendingShops} do'kon tasdiq kutmoqda</li>}
                                        {data.support.open > 5 && <li>· {data.support.open} ochiq support ticket</li>}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* 4x2 KPI Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
                            <Kpi icon={Users} label="Foydalanuvchi" value={String(data.users.total)}
                                hint={`+${data.users.new} yangi`} color="#3b82f6" />
                            <Kpi icon={Users} label="Aktiv" value={String(data.users.active)}
                                hint={`${days} kun ichida`} color="#10b981" />
                            <Kpi icon={Store} label="BN Do'kon" value={String(data.bn.approvedShops)}
                                hint={data.bn.pendingShops > 0 ? `${data.bn.pendingShops} kutmoqda` : "tasdiqlangan"} color="#f5b301" />
                            <Kpi icon={ShoppingCart} label="BN buyurtma" value={String(data.bn.totalOrders)}
                                hint={`+${data.bn.newOrders} yangi`} color="#8b5cf6" />
                            <Kpi icon={Wallet} label="Bu oy tushum" value={fmtShort(data.bn.monthRevenue)}
                                hint={`komis. ${fmtShort(data.bn.monthCommission)}`} color="#f5b301" />
                            <Kpi icon={MessageCircle} label="Nexus post" value={String(data.nexus.totalPosts)}
                                hint={`+${data.nexus.newPosts}`} color="#ec4899" />
                            <Kpi icon={Calendar} label="Belis" value={String(data.belis.totalBookings)}
                                hint={`+${data.belis.newBookings}`} color="#eab308" />
                            <Kpi icon={LifeBuoy} label="Support" value={String(data.support.open)}
                                hint={`${data.support.aiHandled} AI orqali`} color="#ef4444" />
                        </div>

                        {/* Trend chart */}
                        {data.trend.length > 1 && (
                            <div className="rounded-2xl p-4 mb-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                <p className="text-[13.5px] font-black mb-3">Kunlik dinamika (oxirgi {days} kun)</p>
                                <div className="grid grid-cols-3 gap-4">
                                    <MiniBars title="Yangi user" data={data.trend} pick={p => p.users} color="#3b82f6" />
                                    <MiniBars title="BN buyurtma" data={data.trend} pick={p => p.bnOrders} color="#f5b301" />
                                    <MiniBars title="Nexus post" data={data.trend} pick={p => p.posts} color="#ec4899" />
                                </div>
                            </div>
                        )}

                        {/* Top listlar 2 ustun */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            {/* Top do'konlar */}
                            <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <p className="text-[13.5px] font-black">Top do'konlar (buyurtma soni)</p>
                                </div>
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {data.topShops.slice(0, 8).map((s, i) => (
                                        <div key={s.shopId} className="flex items-center gap-3 p-2.5">
                                            <span className="w-6 h-6 rounded grid place-items-center text-[11px] font-black flex-shrink-0"
                                                style={{ background: i === 0 ? "#f5b301" : "#e5e5e5", color: i === 0 ? "#000" : "#525252" }}>
                                                {i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12.5px] font-bold truncate">{s.name}</p>
                                                <p className="text-[10.5px] text-neutral-500">
                                                    Rating {s.rating > 0 ? s.rating.toFixed(1) : "—"} · {s.tier}
                                                </p>
                                            </div>
                                            <p className="text-[12px] font-black text-neutral-900 dark:text-neutral-100">{s.orderCount}</p>
                                        </div>
                                    ))}
                                    {data.topShops.length === 0 && (
                                        <p className="p-4 text-center text-[12px] text-neutral-500">Ma'lumot yo'q</p>
                                    )}
                                </div>
                            </div>

                            {/* Bu hafta top mahsulotlar */}
                            <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-purple-500" />
                                    <p className="text-[13.5px] font-black">Bu {days} kun eng sotilgan</p>
                                </div>
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {data.topProducts.slice(0, 8).map((p, i) => (
                                        <div key={p.productId} className="flex items-center gap-3 p-2.5">
                                            <span className="w-6 h-6 rounded grid place-items-center text-[11px] font-black flex-shrink-0"
                                                style={{ background: i === 0 ? "#f5b301" : "#e5e5e5", color: i === 0 ? "#000" : "#525252" }}>
                                                {i + 1}
                                            </span>
                                            <div className="w-9 h-9 rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                                                {p.imageUrl && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12.5px] font-bold truncate">{p.title}</p>
                                                <p className="text-[10.5px] text-neutral-500 truncate">{p.shopName}</p>
                                            </div>
                                            <p className="text-[12px] font-black text-purple-600">{p.soldQty} dona</p>
                                        </div>
                                    ))}
                                    {data.topProducts.length === 0 && (
                                        <p className="p-4 text-center text-[12px] text-neutral-500">Ma'lumot yo'q</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top sotuvchilar (tushum) */}
                        {data.topSellers.length > 0 && (
                            <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-5">
                                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                                    <Bot className="w-4 h-4 text-yellow-600" />
                                    <p className="text-[13.5px] font-black">Bu {days} kun top sotuvchilar (tushum)</p>
                                </div>
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {data.topSellers.slice(0, 8).map((s, i) => {
                                        const maxRev = data.topSellers[0].revenue || 1;
                                        const w = Math.round((s.revenue / maxRev) * 100);
                                        return (
                                            <div key={s.shopId} className="p-2.5">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="w-6 h-6 rounded grid place-items-center text-[11px] font-black flex-shrink-0"
                                                        style={{ background: i === 0 ? "#f5b301" : "#e5e5e5", color: i === 0 ? "#000" : "#525252" }}>
                                                        {i + 1}
                                                    </span>
                                                    <p className="text-[12.5px] font-bold flex-1 truncate">{s.name}</p>
                                                    <p className="text-[12px] font-black text-neutral-900 dark:text-neutral-100">{fmtSom(s.revenue)}</p>
                                                </div>
                                                <div className="ml-9 h-1 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                                    <div style={{ width: `${w}%`, height: "100%", background: "#f5b301" }} />
                                                </div>
                                                <p className="ml-9 text-[10.5px] text-neutral-500 mt-0.5">{s.orders} buyurtma</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Kpi({ icon: Icon, label, value, hint, color }: {
    icon: typeof Users; label: string; value: string; hint?: string; color: string;
}) {
    return (
        <div className="rounded-2xl p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <p className="text-[10.5px] font-black uppercase tracking-wider text-neutral-500">{label}</p>
            </div>
            <p className="text-[18px] font-black leading-tight">{value}</p>
            {hint && <p className="text-[10.5px] text-neutral-500 mt-0.5">{hint}</p>}
        </div>
    );
}

function MiniBars({ title, data, pick, color }: {
    title: string; data: Trend[]; pick: (p: Trend) => number; color: string;
}) {
    const values = data.map(pick);
    const max = Math.max(1, ...values);
    const total = values.reduce((a, b) => a + b, 0);
    return (
        <div>
            <div className="flex items-baseline justify-between mb-2">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-neutral-500">{title}</span>
                <span className="text-[13px] font-black tabular-nums" style={{ color }}>{total}</span>
            </div>
            <div className="flex items-end gap-1 h-16">
                {data.map((p, i) => {
                    const v = pick(p);
                    const h = Math.round((v / max) * 100);
                    const isLast = i === data.length - 1;
                    return (
                        <div key={p.day} title={`${p.day.slice(5)}: ${v}`}
                            className="flex-1 flex flex-col justify-end">
                            <div className="w-full rounded-t transition-all"
                                style={{ background: color, height: `${Math.max(3, h)}%`, opacity: v === 0 ? 0.15 : isLast ? 1 : 0.65 }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
