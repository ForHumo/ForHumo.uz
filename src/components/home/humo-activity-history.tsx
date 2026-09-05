"use client";

// Cross-modul aktivlik tarixi - to'liq (100 tagacha) filtrlash bilan.

import { useEffect, useState, useMemo } from "react";
import { Link } from "@/i18n/routing";
import {
    ShoppingCart, Calendar, Wallet, LifeBuoy, Bell, Package,
    ChevronRight, Loader2, ArrowLeft, Filter, Layers,
} from "lucide-react";

interface Item {
    id: string; kind: string; title: string;
    subtitle?: string; amount?: number; currency?: string;
    status?: string; href?: string; at: string;
}

const KIND_META: Record<string, { icon: typeof Bell; color: string; label: string }> = {
    bn_order:       { icon: ShoppingCart, color: "#f5b301", label: "BN" },
    belis_booking:  { icon: Calendar,     color: "#eab308", label: "Belis" },
    pay_tx:         { icon: Wallet,       color: "#3b82f6", label: "Pay" },
    support_ticket: { icon: LifeBuoy,     color: "#ef4444", label: "Support" },
    nexus_notif:    { icon: Bell,         color: "#ec4899", label: "Nexus" },
    market_order:   { icon: Package,      color: "#10b981", label: "Market" },
};

const FILTERS = [
    { key: "all",           label: "Barchasi" },
    { key: "bn_order",      label: "BN" },
    { key: "belis_booking", label: "Belis" },
    { key: "pay_tx",        label: "Pay" },
    { key: "support_ticket", label: "Support" },
    { key: "nexus_notif",   label: "Nexus" },
];

function relTime(iso: string): string {
    const d = Date.now() - new Date(iso).getTime();
    const s = Math.floor(d / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    return `${Math.floor(s / 86400)} kun`;
}

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }
function fmtCurrency(n: number, c?: string): string {
    if (c === "USD") return `$${n.toFixed(2)}`;
    return fmtSom(n);
}

export function HumoActivityHistory() {
    const [items, setItems] = useState<Item[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        setLoading(true);
        fetch("/api/user/activity?limit=100", { cache: "no-store" })
            .then(r => r.ok ? r.json() : { items: [] })
            .then(j => setItems(j.items || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!items) return [];
        if (filter === "all") return items;
        return items.filter(i => i.kind === filter);
    }, [items, filter]);

    // Sana bo'yicha guruh
    const grouped = useMemo(() => {
        const g = new Map<string, Item[]>();
        for (const it of filtered) {
            const day = it.at.slice(0, 10);
            const arr = g.get(day) || [];
            arr.push(it);
            g.set(day, arr);
        }
        return [...g.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [filtered]);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Sarlavha */}
                <div className="flex items-center gap-3 mb-5">
                    <Link href={"/humo" as never}
                        className="w-10 h-10 rounded-xl grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <span className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)" }}>
                        <Layers className="w-5 h-5 text-white" />
                    </span>
                    <div>
                        <h1 className="text-[22px] font-black leading-tight">Aktivlik tarixi</h1>
                        <p className="text-[13px] text-neutral-500">Barcha modul so'nggi 100 harakat</p>
                    </div>
                </div>

                {/* Filter chip'lar */}
                <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
                    <Filter className="w-4 h-4 flex-shrink-0 text-neutral-500" />
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className="h-8 px-3 rounded-lg text-[12px] font-black flex-shrink-0"
                            style={{
                                background: filter === f.key ? "#000" : "#fff",
                                color: filter === f.key ? "#fff" : "#71717a",
                                border: `1px solid ${filter === f.key ? "#000" : "#e5e5e5"}`,
                            }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="text-center py-12">
                        <Layers className="w-10 h-10 mx-auto mb-2 opacity-30 text-neutral-400" />
                        <p className="text-[13px] text-neutral-500">Aktivlik yo'q</p>
                    </div>
                )}

                {grouped.map(([day, dayItems]) => (
                    <div key={day} className="mb-5">
                        <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-2 sticky top-0 bg-neutral-50 dark:bg-neutral-950 py-1">
                            {new Date(day).toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric", month: "long" })}
                        </p>
                        <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                            {dayItems.map(it => {
                                const meta = KIND_META[it.kind] || KIND_META.nexus_notif;
                                const Icon = meta.icon;
                                const inner = (
                                    <>
                                        <span className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
                                            style={{ background: meta.color + "22", color: meta.color }}>
                                            <Icon className="w-4 h-4" />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold truncate">{it.title}</p>
                                            {it.subtitle && <p className="text-[11.5px] text-neutral-500 truncate">{it.subtitle}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            {it.amount !== undefined && (
                                                <p className="text-[12px] font-black">{fmtCurrency(it.amount, it.currency)}</p>
                                            )}
                                            <p className="text-[10.5px] text-neutral-500">{relTime(it.at)}</p>
                                        </div>
                                        {it.href && <ChevronRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />}
                                    </>
                                );
                                const cls = "flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition";
                                return it.href ? (
                                    <Link key={it.id} href={it.href as never} className={cls}>{inner}</Link>
                                ) : (
                                    <div key={it.id} className={cls}>{inner}</div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
