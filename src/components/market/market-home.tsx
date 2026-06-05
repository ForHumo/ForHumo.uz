"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    BadgeCheck, TrendingUp, ArrowRight, Flame, Zap, Tag, ChevronRight,
} from "lucide-react";
import { MARKET_CATEGORIES } from "@/lib/market-categories";
import { ProductCard } from "./product-card";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Product {
    id: string; name: string; slug: string; price: string; oldPrice: string | null;
    images: string[]; rating: number; reviewCount: number; sold: number;
    isFeatured: boolean; category: string;
    brand: { name: string; slug: string; verified: boolean; logo: string | null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fz(v: string | number) { return Number(v).toLocaleString(); }
function discount(price: string, old: string | null) {
    if (!old) return null;
    return Math.round((1 - Number(price) / Number(old)) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedBackground
// ─────────────────────────────────────────────────────────────────────────────
function MarketBg() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute inset-0
                bg-gradient-to-br from-white via-green-50/40 to-emerald-50/60
                dark:from-[#020C05] dark:via-[#030F06] dark:to-[#051209]
                transition-colors duration-700" />
            <motion.div className="absolute rounded-full blur-[140px] opacity-25 dark:opacity-15
                bg-green-400 dark:bg-emerald-600"
                style={{ width: 700, height: 700, top: "-15%", right: "-10%" }}
                animate={{ x: [0, 50, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.95, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
            <motion.div className="absolute rounded-full blur-[180px] opacity-15 dark:opacity-10
                bg-lime-300 dark:bg-green-500"
                style={{ width: 500, height: 500, bottom: "5%", left: "-8%" }}
                animate={{ x: [0, -30, 40, 0], y: [0, 25, -15, 0], scale: [1, 0.92, 1.1, 1] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 4 }} />
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(34,197,94,0.6) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(34,197,94,0.6) 1px, transparent 1px)`,
                    backgroundSize: "56px 56px",
                }} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryPill — gorizontal scroll kategoriyalar
// ─────────────────────────────────────────────────────────────────────────────
function CategoryPills() {
    const locale = useLocale();
    return (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {MARKET_CATEGORIES.map((cat, i) => {
                const Icon = cat.icon;
                return (
                    <motion.div key={cat.slug}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}>
                        <Link href={`/market/catalog?cat=${cat.slug}`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl
                                bg-white/80 dark:bg-white/[0.04]
                                border border-gray-100 dark:border-white/[0.06]
                                hover:border-green-300 dark:hover:border-green-600/30
                                hover:bg-green-50 dark:hover:bg-green-900/10
                                whitespace-nowrap text-sm font-semibold
                                text-gray-600 dark:text-white/50
                                hover:text-green-700 dark:hover:text-green-400
                                transition-all duration-200 group">
                            <div className="w-6 h-6 flex items-center justify-center">
                                <Icon size={16} style={{ color: cat.color }}
                                    className="group-hover:scale-110 transition-transform" />
                            </div>
                            {cat.name}
                        </Link>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MarketHome
// ─────────────────────────────────────────────────────────────────────────────
export function MarketHome() {
    const locale = useLocale();
    const [featured, setFeatured]   = useState<Product[]>([]);
    const [allProducts, setAll]     = useState<Product[]>([]);
    const [loading, setLoading]     = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/market/products?featured=1&limit=6").then(r => r.json()),
            fetch("/api/market/products?limit=20").then(r => r.json()),
        ]).then(([f, a]) => {
            setFeatured(f.products ?? []);
            setAll(a.products ?? []);
        }).finally(() => setLoading(false));
    }, []);

    return (
        <>
            <MarketBg />
            <div className="min-h-screen">

                {/* ── Hero banner ── */}
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0
                        bg-gradient-to-br from-green-600/90 via-emerald-600/85 to-teal-600/80
                        dark:from-green-900/80 dark:via-emerald-900/75 dark:to-teal-900/70" />
                    {/* Animatsiyali orqa fon */}
                    <motion.div className="absolute inset-0 opacity-20"
                        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        style={{
                            backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
                            backgroundSize: "200% 200%",
                        }} />

                    <div className="relative container mx-auto px-4 max-w-6xl py-14">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, type: "spring" }}>
                            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm
                                border border-white/20 rounded-full px-4 py-1.5 mb-5">
                                <Zap size={13} className="text-yellow-300" />
                                <span className="text-white/90 text-xs font-semibold">Test rejimi — Zij bilan xarid qiling</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
                                Humo Market
                            </h1>
                            <p className="text-white/70 text-lg mb-8 max-w-xl">
                                O'z brendingizni yarating, mahsulotlaringizni joylab soting.
                                To'lov — <span className="text-white font-bold">Ƶ Zij</span> bilan.
                            </p>
                            <div className="flex gap-3">
                                <Link href={`/market/catalog`}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl
                                        bg-white text-green-700 font-bold text-sm
                                        hover:bg-green-50 transition-all shadow-lg shadow-black/10">
                                    <Tag size={16} /> Katalogni ko'rish
                                </Link>
                                <Link href={`/market/brand/create`}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl
                                        bg-white/15 border border-white/25 text-white font-bold text-sm
                                        hover:bg-white/20 transition-all">
                                    + Brend ochish
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <div className="container mx-auto px-4 max-w-6xl py-8 space-y-10">

                    {/* ── Kategoriyalar ── */}
                    <section>
                        <CategoryPills />
                    </section>

                    {/* ── Tanlangan mahsulotlar ── */}
                    <section>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Flame size={18} className="text-orange-500" />
                                <h2 className="text-gray-900 dark:text-white font-bold text-lg">
                                    Eng mashhur mahsulotlar
                                </h2>
                            </div>
                            <Link href={`/market/catalog?featured=1`}
                                className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400
                                    hover:text-green-700 font-semibold transition-colors">
                                Barchasi <ChevronRight size={14} />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-white/[0.03] animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                            </div>
                        )}
                    </section>

                    {/* ── Barcha mahsulotlar ── */}
                    <section>
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp size={18} className="text-green-500" />
                            <h2 className="text-gray-900 dark:text-white font-bold text-lg">
                                Barcha mahsulotlar
                            </h2>
                        </div>
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="h-56 rounded-2xl bg-gray-100 dark:bg-white/[0.03] animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {allProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                            </div>
                        )}
                    </section>

                    {/* ── Brend bo'lish banner ── */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative overflow-hidden rounded-3xl
                            bg-gradient-to-br from-green-600/10 to-emerald-500/5
                            dark:from-green-900/20 dark:to-emerald-900/10
                            border border-green-200/60 dark:border-green-700/20 p-8">
                        <div className="max-w-lg">
                            <BadgeCheck size={28} className="text-green-500 mb-3" />
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                                O'z brendingizni oching
                            </h3>
                            <p className="text-gray-500 dark:text-white/40 text-sm mb-5 leading-relaxed">
                                Mahsulotlaringizni Humo Market da soting. Brendingiz tasdiqlansa —
                                rasmiy belgini olasiz va mijozlar ishonchi oshadi.
                            </p>
                            <Link href={`/market/brand/create`}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                                    bg-gradient-to-r from-green-600 to-emerald-500
                                    text-white font-bold text-sm
                                    hover:from-green-500 hover:to-emerald-400
                                    shadow-lg shadow-green-500/20 transition-all">
                                Brend ochish <ArrowRight size={15} />
                            </Link>
                        </div>
                    </motion.section>

                </div>
            </div>
        </>
    );
}
