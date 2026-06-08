"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
    LayoutDashboard, TrendingUp, ShoppingBag, Package, Inbox, Store,
    Box, Loader2, ChevronRight, Crown,
} from "lucide-react";

interface TopProduct { name: string; slug: string; image: string | null; qty: number; revenue: number }
interface Data {
    stats: { revenue: number; sold: number; orders: number; brandCount: number; productCount: number; pendingCount: number };
    topProducts: TopProduct[];
    days: { date: string; revenue: number }[];
}

function fz(v: number) { return Number(v).toLocaleString(); }

export function SellerDashboard() {
    const [data, setData] = useState<Data | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/market/dashboard").then(r => r.json()).then(setData).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-32"><Loader2 size={28} className="animate-spin text-green-500" /></div>;
    if (!data) return <div className="text-center py-32 text-gray-400">Ma&apos;lumot yo&apos;q</div>;

    const { stats, topProducts, days } = data;
    const maxDay = Math.max(1, ...days.map(d => d.revenue));

    const CARDS = [
        { icon: TrendingUp, label: "Daromad", value: `${fz(stats.revenue)} Ƶ`, color: "#10B981" },
        { icon: ShoppingBag, label: "Sotilgan", value: fz(stats.sold), color: "#3B82F6" },
        { icon: Inbox, label: "Buyurtmalar", value: fz(stats.orders), color: "#8B5CF6" },
        { icon: Crown, label: "Faol buyurtma", value: fz(stats.pendingCount), color: "#F59E0B" },
        { icon: Store, label: "Brendlar", value: fz(stats.brandCount), color: "#EC4899" },
        { icon: Box, label: "Mahsulotlar", value: fz(stats.productCount), color: "#06B6D4" },
    ];

    return (
        <div className="container mx-auto px-4 max-w-4xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <Link href="/market/brand/manage" className="hover:text-green-600 transition-colors">Brendlarim</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">Dashboard</span>
            </nav>

            <div className="flex items-center gap-3 mb-8">
                <LayoutDashboard size={22} className="text-green-500" />
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Sotuvchi paneli</h1>
            </div>

            {/* Stat kartalar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {CARDS.map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-4">
                            <Icon size={20} style={{ color: c.color }} className="mb-2" />
                            <p className="text-xl font-black text-gray-900 dark:text-white">{c.value}</p>
                            <p className="text-xs text-gray-400 dark:text-white/30">{c.label}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* 7 kunlik daromad */}
            <div className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-5 mb-8">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4 text-sm">So&apos;nggi 7 kun daromadi</h2>
                <div className="flex items-end justify-between gap-2 h-36">
                    {days.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-white/40">{d.revenue > 0 ? fz(d.revenue) : ""}</span>
                            <motion.div initial={{ height: 0 }} animate={{ height: `${(d.revenue / maxDay) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.4 }}
                                className="w-full rounded-t-lg bg-gradient-to-t from-green-600 to-emerald-400 min-h-[3px]" style={{ minHeight: d.revenue > 0 ? 6 : 3 }} />
                            <span className="text-[10px] text-gray-400 dark:text-white/25">{d.date.slice(5)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top mahsulotlar */}
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-green-500" />
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">Eng ko&apos;p sotilganlar</h2>
            </div>
            {!topProducts.length ? (
                <div className="text-center py-12 bg-gray-50/70 dark:bg-white/[0.02] rounded-2xl">
                    <Package size={36} className="text-gray-200 dark:text-white/10 mx-auto mb-3" />
                    <p className="text-gray-400 dark:text-white/30 text-sm">Hali sotuvlar yo&apos;q</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {topProducts.map((p, i) => (
                        <Link key={p.slug} href={`/market/product/${p.slug}`}
                            className="flex items-center gap-3 bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]
                                hover:border-green-200 dark:hover:border-green-800/30 rounded-2xl p-3 transition-all">
                            <span className="w-6 text-center font-black text-gray-300 dark:text-white/20">{i + 1}</span>
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0">
                                {p.image ? <Image src={p.image} alt={p.name} width={48} height={48} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                            </div>
                            <p className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-black text-green-600 dark:text-green-400">{fz(p.revenue)} Ƶ</p>
                                <p className="text-xs text-gray-400 dark:text-white/30">{fz(p.qty)} dona</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
