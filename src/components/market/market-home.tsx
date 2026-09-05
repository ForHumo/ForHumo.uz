"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    TrendingUp, Flame, Zap, Tag, ChevronRight,
} from "lucide-react";
import { MARKET_CATEGORIES } from "@/lib/market-categories";
import { ProductCard } from "./product-card";
import { AiQuickHelper } from "@/components/ai/ai-quick-helper";

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

// MarketBackground layout da bor — bu yerda kerak emas

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

                    <div className="relative container mx-auto px-4 max-w-6xl py-14
                        flex items-center justify-between gap-8">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, type: "spring" }} className="flex-1 min-w-0">
                            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm
                                border border-white/20 rounded-full px-4 py-1.5 mb-5">
                                <Zap size={13} className="text-yellow-300" />
                                <span className="text-white/90 text-xs font-semibold">Test rejimi — hamyondan xarid qiling</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
                                Humo Market
                            </h1>
                            <p className="text-white/70 text-lg mb-8 max-w-xl">
                                Sifatli mahsulotlar, tez yetkazish. To'lov —
                                <span className="text-white font-bold"> hamyondan</span> darrov.
                            </p>
                            <div className="flex gap-3">
                                <Link href={`/market/catalog`}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl
                                        bg-white text-green-700 font-bold text-sm
                                        hover:bg-green-50 transition-all shadow-lg shadow-black/10">
                                    <Tag size={16} /> Katalogni ko'rish
                                </Link>
                            </div>
                        </motion.div>

                        {/* Katta logo (o'ng tomon) */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 0.7, type: "spring", stiffness: 120 }}
                            className="hidden md:block shrink-0">
                            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                                <Image src="/logos/humo-market.png" alt="Humo Market"
                                    width={180} height={180}
                                    className="w-44 h-44 object-contain drop-shadow-2xl" priority />
                            </motion.div>
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

                </div>
            </div>
            <AiQuickHelper module="market" initialPrompt="Menga sifatli mahsulot toping" />
        </>
    );
}
