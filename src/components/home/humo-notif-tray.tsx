"use client";

// Universal notification tray + global search - root layout uchun.
// Suzuvchi tugma emas — kabinet/humo sahifada ishlatiladi.

import { useEffect, useState, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { Bell, Check, Loader2, Package, Store, Calendar, LifeBuoy, MessageCircle, X, ChevronRight } from "lucide-react";

interface Notif {
    id: string;
    source: "nexus" | "bn" | "belis" | "support" | "market";
    type: string;
    title: string;
    body?: string;
    href?: string;
    read: boolean;
    at: string;
}

const SOURCE_META: Record<string, { icon: typeof Bell; color: string; label: string }> = {
    nexus:   { icon: MessageCircle, color: "#ec4899", label: "Nexus" },
    bn:      { icon: Package,       color: "#f5b301", label: "BN" },
    belis:   { icon: Calendar,      color: "#eab308", label: "Belis" },
    support: { icon: LifeBuoy,      color: "#ef4444", label: "Support" },
    market:  { icon: Store,         color: "#10b981", label: "Market" },
};

function relTime(iso: string): string {
    const d = Date.now() - new Date(iso).getTime();
    const s = Math.floor(d / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    return `${Math.floor(s / 86400)} kun`;
}

export function HumoNotifTray() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Notif[] | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/user/notifications?limit=30", { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setItems(j.items || []);
                setUnreadCount(j.unreadCount || 0);
            }
        } catch { /* skip */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Har 60s badge yangilash (panel yopiq bo'lsa)
    useEffect(() => {
        if (open) return;
        const t = setInterval(load, 60_000);
        return () => clearInterval(t);
    }, [open, load]);

    const markAllRead = async () => {
        try {
            await fetch("/api/user/notifications/read", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ all: true }),
            });
            setUnreadCount(0);
            setItems(prev => prev ? prev.map(i => ({ ...i, read: true })) : prev);
        } catch { /* skip */ }
    };

    const markOne = async (id: string) => {
        try {
            await fetch("/api/user/notifications/read", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
        } catch { /* skip */ }
    };

    return (
        <div className="relative">
            <button onClick={() => setOpen(v => !v)}
                className="relative w-10 h-10 rounded-xl grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                aria-label="Bildirishnomalar">
                <Bell className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[10px] font-black bg-red-500 text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    {/* Backdrop mobile */}
                    <div className="fixed inset-0 z-40 sm:hidden bg-black/30" onClick={() => setOpen(false)} />
                    <div className="fixed sm:absolute inset-x-0 sm:inset-x-auto top-16 sm:top-11 sm:right-0 z-50
                        sm:w-96 max-h-[75vh] rounded-2xl overflow-hidden
                        bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl
                        flex flex-col mx-2 sm:mx-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
                            <Bell className="w-4 h-4 text-neutral-500" />
                            <p className="text-[13px] font-black flex-1">Bildirishnomalar {unreadCount > 0 && `(${unreadCount})`}</p>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead}
                                    className="h-7 px-2 rounded-lg text-[11px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-blue-600">
                                    <Check className="w-3 h-3 inline mr-0.5" /> Barchasi
                                </button>
                            )}
                            <button onClick={() => setOpen(false)}
                                className="w-7 h-7 rounded-lg grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <X className="w-3.5 h-3.5 text-neutral-500" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading && !items && (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                                </div>
                            )}
                            {items && items.length === 0 && (
                                <div className="text-center py-10">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-neutral-400" />
                                    <p className="text-[12.5px] text-neutral-500">Yangi bildirishnoma yo'q</p>
                                </div>
                            )}
                            {items && items.map(n => {
                                const meta = SOURCE_META[n.source] || SOURCE_META.nexus;
                                const Icon = meta.icon;
                                const inner = (
                                    <>
                                        <span className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0"
                                            style={{ background: meta.color + "22", color: meta.color }}>
                                            <Icon className="w-4 h-4" />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12.5px] font-bold truncate">{n.title}</p>
                                            {n.body && <p className="text-[11.5px] text-neutral-500 line-clamp-2">{n.body}</p>}
                                            <p className="text-[10.5px] text-neutral-400 mt-0.5">
                                                <span className="uppercase tracking-wider font-black">{meta.label}</span> · {relTime(n.at)}
                                            </p>
                                        </div>
                                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                                        {n.href && <ChevronRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />}
                                    </>
                                );
                                const cls = `flex items-start gap-2.5 p-3 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`;
                                return n.href ? (
                                    <Link key={n.id} href={n.href as never}
                                        onClick={() => { markOne(n.id); setOpen(false); }}
                                        className={cls}>
                                        {inner}
                                    </Link>
                                ) : (
                                    <div key={n.id} className={cls}>
                                        {inner}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
