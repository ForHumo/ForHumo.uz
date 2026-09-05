"use client";

// Humo universal dashboard — barcha modul birlashtirilgan holat.
// Foydalanuvchi kirsa bir joydan hamma narsani ko'radi.

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import {
    Wallet, ShoppingCart, Store, Package, MessageCircle,
    Bell, LifeBuoy, ChevronRight, Loader2, TrendingUp,
    Calendar, Layers, ArrowRight,
} from "lucide-react";
import { HumoAssistantPanel } from "./humo-assistant-panel";
import { HumoNotifTray } from "./humo-notif-tray";
import { HumoSearchPalette } from "./humo-search-palette";

const FOUNDER_USERNAMES = ["abduvoris", "aaa", "forhumo"];

interface DashboardResp {
    profile: { id: string; name: string | null; username: string | null; humoId: string | null; image: string | null };
    modules: {
        pay: { balance: number; currency: string; recent: { id: string; type: string; amount: number; currency: string; description: string | null; at: string }[] };
        bn: {
            activeOrders: number; monthSpent: number;
            hasShop: boolean; shopStatus: string | null; shopName: string | null; shopSlug: string | null;
            sellerStats: { monthRevenue: number; monthOrders: number; activeOrders: number; unreadInsights: number } | null;
        };
        market: { activeOrders: number };
        belis: { activeBookings: number };
        nexus: { unreadDM: number; unreadNotif: number };
        support: { openTickets: number };
    };
}

interface ActivityItem {
    id: string; kind: string; title: string;
    subtitle?: string; amount?: number; currency?: string;
    status?: string; href?: string; at: string;
}

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }
function fmtCurrency(n: number, c: string): string {
    if (c === "USD") return `$${n.toFixed(2)}`;
    return fmtSom(n);
}
function relTime(iso: string): string {
    const d = Date.now() - new Date(iso).getTime();
    const s = Math.floor(d / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    return `${Math.floor(s / 86400)} kun`;
}

export function HumoDashboard() {
    const [data, setData] = useState<DashboardResp | null>(null);
    const [activity, setActivity] = useState<ActivityItem[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/user/dashboard", { cache: "no-store" }).then(r => r.ok ? r.json() : null),
            fetch("/api/user/activity?limit=15", { cache: "no-store" }).then(r => r.ok ? r.json() : null),
        ]).then(([d, a]) => {
            setData(d);
            setActivity(a?.items ?? []);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    // Realtime SSE — 15s ticker unread + aktiv
    useEffect(() => {
        let es: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        const connect = () => {
            try {
                es = new EventSource("/api/user/dashboard/stream");
                es.onmessage = (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        if (msg.type === "tick") {
                            setData(prev => prev ? {
                                ...prev,
                                modules: {
                                    ...prev.modules,
                                    nexus: { ...prev.modules.nexus, unreadDM: msg.nexusUnread, unreadNotif: msg.notif },
                                    bn: { ...prev.modules.bn, activeOrders: msg.bnActive },
                                },
                            } : prev);
                        } else if (msg.type === "reconnect") {
                            es?.close();
                            reconnectTimer = setTimeout(connect, 1000);
                        }
                    } catch { /* skip */ }
                };
                es.onerror = () => {
                    es?.close();
                    reconnectTimer = setTimeout(connect, 5000);
                };
            } catch { /* skip */ }
        };
        connect();
        return () => {
            if (es) es.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
        );
    }
    if (!data) return null;

    const m = data.modules;
    const totalNotifs = m.nexus.unreadDM + m.nexus.unreadNotif + m.support.openTickets;
    const isFounder = !!data.profile.username && FOUNDER_USERNAMES.includes(data.profile.username);

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
            {/* Top bar: search + notif */}
            <div className="flex items-center justify-end gap-1 -mt-2 mb-1">
                <HumoSearchPalette />
                <HumoNotifTray />
            </div>

            {/* Salom + KPI */}
            <div className="rounded-3xl p-5 sm:p-6 relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, hsl(220 80% 55%) 0%, hsl(260 70% 55%) 100%)",
                }}>
                <div className="relative z-10">
                    <p className="text-[13px] text-white/80 font-bold">
                        {data.profile.humoId && <span className="font-black">{data.profile.humoId}</span>}
                        {data.profile.username && <> · @{data.profile.username}</>}
                    </p>
                    <h1 className="text-[24px] sm:text-[28px] font-black text-white mt-1 leading-tight">
                        Assalomu alaykum{data.profile.name ? `, ${data.profile.name.split(" ")[0]}` : ""}
                    </h1>
                    <p className="text-[13px] text-white/90 mt-1">
                        For Humo super-app — bir joyda barcha ishlaringiz
                    </p>

                    {/* 4 KPI mini kartalar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                        <MiniKpi icon={Wallet} label="Balans" value={fmtCurrency(m.pay.balance, m.pay.currency)} href="/pay" />
                        <MiniKpi icon={ShoppingCart} label="Aktiv buyurtma" value={String(m.bn.activeOrders + m.market.activeOrders + m.belis.activeBookings)} href="/bn/kabinet" />
                        <MiniKpi icon={Bell} label="Yangi" value={String(totalNotifs)} href="/nexus" />
                        <MiniKpi icon={TrendingUp} label="Bu oy sarflagan" value={fmtSom(m.bn.monthSpent)} href="/bn/kabinet" />
                    </div>
                </div>
                {/* Dekor */}
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10" />
                <div className="absolute -right-8 -bottom-20 w-32 h-32 rounded-full bg-white/10" />
            </div>

            {/* Founder yorlig'i */}
            {isFounder && (
                <Link href={"/admin/analytics" as never}
                    className="block rounded-2xl p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-105 transition">
                    <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl grid place-items-center bg-white/20 backdrop-blur-sm flex-shrink-0">
                            <TrendingUp className="w-5 h-5" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-black">Founder Analytics</p>
                            <p className="text-[11.5px] text-white/85">Barcha modul cross-modul katta rasm</p>
                        </div>
                        <ArrowRight className="w-4 h-4 flex-shrink-0" />
                    </div>
                </Link>
            )}

            {/* Sotuvchi paneli (BN'da do'koni bor bo'lsa) */}
            {m.bn.sellerStats && m.bn.hasShop && (
                <div className="rounded-2xl p-4"
                    style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 60%)", border: "1px solid #F5B301" }}>
                    <div className="flex items-start gap-3">
                        <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                            style={{ background: "#F5B301", color: "#000" }}>
                            <Store className="w-5 h-5" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-[14px] font-black text-neutral-900 truncate">{m.bn.shopName}</p>
                                {m.bn.sellerStats.unreadInsights > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase animate-pulse"
                                        style={{ background: "#F5B301", color: "#000" }}>
                                        {m.bn.sellerStats.unreadInsights} yangi AI tavsiya
                                    </span>
                                )}
                            </div>
                            <p className="text-[12px] text-neutral-700">
                                Bu oy: <b>{fmtSom(m.bn.sellerStats.monthRevenue)}</b> · {m.bn.sellerStats.monthOrders} buyurtma
                                {m.bn.sellerStats.activeOrders > 0 && (
                                    <> · <span className="text-orange-700 font-black">{m.bn.sellerStats.activeOrders} kutmoqda</span></>
                                )}
                            </p>
                        </div>
                        <Link href={"/bn/sotuvchi/tahlil" as never}
                            className="h-9 px-3 rounded-lg inline-flex items-center gap-1 text-[12px] font-black hover:brightness-95 flex-shrink-0"
                            style={{ background: "#000", color: "#F5B301" }}>
                            Tahlil <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Modul kartalar */}
            <div>
                <p className="text-[12px] font-black uppercase tracking-widest text-neutral-500 mb-2">Modullar</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <ModuleCard icon={ShoppingCart} name="Bozor Narxida" desc="Bozor narxida onlayn" href="/bn" badge={m.bn.activeOrders || undefined} />
                    <ModuleCard icon={Package} name="Humo Market" desc="Onlayn supermarket" href="/market" badge={m.market.activeOrders || undefined} />
                    <ModuleCard icon={Calendar} name="Belis" desc="Sarpo qutilari ijara" href="/belis" badge={m.belis.activeBookings || undefined} />
                    <ModuleCard icon={MessageCircle} name="Nexus" desc="Ijtimoiy tarmoq" href="/nexus" badge={m.nexus.unreadDM || undefined} />
                    <ModuleCard icon={Wallet} name="Pay" desc="Hamyon va o'tkazma" href="/pay" />
                    <ModuleCard icon={LifeBuoy} name="Yordam" desc="Support" href="/support" badge={m.support.openTickets || undefined} />
                    <ModuleCard icon={Calendar} name="Kalendar" desc="Barcha voqealar" href="/humo/kalendar" />
                </div>
            </div>

            {/* Universal AI Assistant (suzuvchi tugma) */}
            <HumoAssistantPanel />

            {/* Aktivlik feed */}
            {activity && activity.length > 0 && (
                <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-neutral-500" />
                        <p className="text-[14px] font-black">So'nggi aktivlik</p>
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {activity.slice(0, 10).map(it => {
                            const IconMap: Record<string, typeof ShoppingCart> = {
                                bn_order: ShoppingCart, belis_booking: Calendar, pay_tx: Wallet,
                                support_ticket: LifeBuoy, nexus_notif: Bell, market_order: Package,
                            };
                            const Icon = IconMap[it.kind] || Bell;
                            const inner = (
                                <>
                                    <span className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
                                        <Icon className="w-4 h-4 text-neutral-600" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold truncate">{it.title}</p>
                                        {it.subtitle && <p className="text-[11.5px] text-neutral-500 truncate">{it.subtitle}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        {it.amount !== undefined && (
                                            <p className="text-[12px] font-black text-neutral-900 dark:text-neutral-100">
                                                {fmtCurrency(it.amount, it.currency || "UZS")}
                                            </p>
                                        )}
                                        <p className="text-[10.5px] text-neutral-500">{relTime(it.at)}</p>
                                    </div>
                                    {it.href && <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                                </>
                            );
                            return it.href ? (
                                <Link key={it.id} href={it.href as never}
                                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition">
                                    {inner}
                                </Link>
                            ) : (
                                <div key={it.id} className="flex items-center gap-3 p-3">
                                    {inner}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniKpi({ icon: Icon, label, value, href }: {
    icon: typeof Wallet; label: string; value: string; href: string;
}) {
    return (
        <Link href={href as never}
            className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm transition block">
            <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3.5 h-3.5 text-white/90" />
                <p className="text-[10.5px] font-black uppercase tracking-wider text-white/80">{label}</p>
            </div>
            <p className="text-[15px] font-black text-white truncate">{value}</p>
        </Link>
    );
}

function ModuleCard({ icon: Icon, name, desc, href, badge }: {
    icon: typeof Wallet; name: string; desc: string; href: string; badge?: number;
}) {
    return (
        <Link href={href as never}
            className="relative p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition">
            {badge !== undefined && badge > 0 && (
                <span className="absolute top-2 right-2 min-w-5 h-5 px-1.5 rounded-full grid place-items-center text-[10px] font-black bg-red-500 text-white">
                    {badge > 99 ? "99+" : badge}
                </span>
            )}
            <div className="flex items-center gap-2 mb-1">
                <span className="w-8 h-8 rounded-lg grid place-items-center bg-neutral-100 dark:bg-neutral-800">
                    <Icon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                </span>
                <p className="text-[13px] font-black truncate">{name}</p>
            </div>
            <p className="text-[11px] text-neutral-500">{desc}</p>
        </Link>
    );
}
