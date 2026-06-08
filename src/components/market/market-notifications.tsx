"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
    Bell, ThumbsUp, MessageSquare, Star, Package,
    CheckCircle2, Loader2, ChevronRight, BadgeCheck, Truck, HelpCircle, CheckCheck,
} from "lucide-react";

type NotifType = "REVIEW_LIKE" | "PRODUCT_REVIEW" | "BRAND_REVIEW"
    | "ORDER_DELIVERED" | "ORDER_ACCEPTED" | "ORDER_UPDATE" | "REVIEW_REMINDER" | "REPLY"
    | "QUESTION" | "ANSWER";

interface Notif {
    id: string; type: NotifType; title: string; body: string | null;
    link: string | null; image: string | null; read: boolean; createdAt: string;
}

const META: Record<NotifType, { icon: React.ElementType; color: string }> = {
    REVIEW_LIKE:     { icon: ThumbsUp,     color: "#F59E0B" },
    PRODUCT_REVIEW:  { icon: MessageSquare, color: "#8B5CF6" },
    BRAND_REVIEW:    { icon: BadgeCheck,   color: "#10B981" },
    ORDER_DELIVERED: { icon: Package,      color: "#3B82F6" },
    ORDER_ACCEPTED:  { icon: CheckCircle2, color: "#10B981" },
    ORDER_UPDATE:    { icon: Truck,        color: "#3B82F6" },
    REVIEW_REMINDER: { icon: Star,         color: "#F59E0B" },
    REPLY:           { icon: MessageSquare, color: "#06B6D4" },
    QUESTION:        { icon: HelpCircle,   color: "#8B5CF6" },
    ANSWER:          { icon: MessageSquare, color: "#10B981" },
};

function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Hozir";
    if (m < 60) return `${m} daq. oldin`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} soat oldin`;
    return new Date(d).toLocaleDateString("uz-UZ");
}

export function MarketNotifications() {
    const [items, setItems] = useState<Notif[]>([]);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);

    useEffect(() => {
        fetch("/api/market/notifications").then(r => r.json())
            .then(d => setItems(d.items ?? []))
            .finally(() => setLoading(false));
    }, []);

    const unreadCount = items.filter(n => !n.read).length;

    async function markAll() {
        setMarking(true);
        try {
            const res = await fetch("/api/market/notifications/read", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
            });
            if (res.ok) setItems(prev => prev.map(n => ({ ...n, read: true })));
        } finally { setMarking(false); }
    }

    function markOne(id: string) {
        setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        fetch("/api/market/notifications/read", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
        }).catch(() => {});
    }

    return (
        <div className="container mx-auto px-4 max-w-2xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">Bildirishnomalar</span>
            </nav>

            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <Bell size={20} className="text-green-500" />
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Bildirishnomalar</h1>
                    {unreadCount > 0 && (
                        <span className="text-xs font-bold bg-green-500 text-white rounded-full px-2 py-0.5">{unreadCount}</span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAll} disabled={marking}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400
                            font-semibold text-xs hover:bg-green-500/20 disabled:opacity-40 transition-all shrink-0">
                        {marking ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                        Barchasini o&apos;qilgan
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-green-500" /></div>
            ) : !items.length ? (
                <div className="text-center py-20">
                    <Bell size={48} className="text-gray-200 dark:text-white/10 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-white/40 text-sm">Hali bildirishnoma yo'q</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((n, i) => {
                        const meta = META[n.type];
                        const Icon = meta.icon;
                        const inner = (
                            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors
                                ${n.read
                                    ? "bg-white/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]"
                                    : "bg-green-50/60 dark:bg-green-900/10 border border-green-200/60 dark:border-green-800/20"}`}>
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: meta.color + "18" }}>
                                    {n.image
                                        ? <Image src={n.image} alt="" width={40} height={40} className="w-full h-full object-cover rounded-2xl" />
                                        : <Icon size={18} style={{ color: meta.color }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-900 dark:text-white text-sm font-semibold">{n.title}</p>
                                    {n.body && <p className="text-gray-500 dark:text-white/40 text-xs truncate">{n.body}</p>}
                                    <p className="text-gray-300 dark:text-white/20 text-xs mt-0.5">{timeAgo(n.createdAt)}</p>
                                </div>
                                {!n.read && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                            </div>
                        );
                        return (
                            <motion.div key={n.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                onClick={() => { if (!n.read) markOne(n.id); }} className="cursor-pointer">
                                {n.link ? <Link href={n.link}>{inner}</Link> : inner}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
