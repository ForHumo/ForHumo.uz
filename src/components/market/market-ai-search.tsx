"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Sparkles, Loader2, ChevronRight, Search, Tag, Layers, ArrowUpDown, AlertCircle } from "lucide-react";
import { ProductCard } from "./product-card";

interface Product {
    id: string; name: string; slug: string; price: string; oldPrice: string | null;
    images: string[]; rating: number; reviewCount: number; sold: number; isFeatured: boolean;
    stock?: number; category?: string;
    brand: { name: string; slug: string; verified: boolean };
}
interface Interpretation {
    keywords: string | null; category: string | null; categoryName: string | null;
    minPrice: number | null; maxPrice: number | null; sort: string | null;
}

const EXAMPLES = ["200 000 gacha qishki kurtka", "eng arzon smartfon", "reytingi yuqori quloqchin", "5000 dan 20000 gacha sovg'a"];
const SORT_LABEL: Record<string, string> = { price_asc: "Arzon avval", price_desc: "Qimmat avval", rating: "Reyting", popular: "Mashhur" };

function fz(v: number) { return Number(v).toLocaleString(); }

export function MarketAISearch() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [interp, setInterp] = useState<Interpretation | null>(null);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState("");

    async function run(q?: string) {
        const text = (q ?? query).trim();
        if (!text) return;
        if (q) setQuery(q);
        setLoading(true); setError(""); setSearched(true);
        try {
            const res = await fetch("/api/ai/search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text }),
            });
            const d = await res.json();
            if (!res.ok) { setError(d.error || "Xatolik"); setProducts([]); setInterp(null); }
            else { setProducts(d.products ?? []); setInterp(d.interpretation ?? null); }
        } catch { setError("Xatolik"); } finally { setLoading(false); }
    }

    const chips: { icon: React.ElementType; label: string }[] = [];
    if (interp?.keywords) chips.push({ icon: Search, label: interp.keywords });
    if (interp?.categoryName) chips.push({ icon: Layers, label: interp.categoryName });
    if (interp?.minPrice || interp?.maxPrice) chips.push({ icon: Tag, label: `${interp.minPrice ? fz(interp.minPrice) : "0"} – ${interp.maxPrice ? fz(interp.maxPrice) : "∞"} Ƶ` });
    if (interp?.sort && SORT_LABEL[interp.sort]) chips.push({ icon: ArrowUpDown, label: SORT_LABEL[interp.sort] });

    return (
        <div className="container mx-auto px-4 max-w-6xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">AI qidiruv</span>
            </nav>

            <div className="flex items-center gap-2 mb-2">
                <Sparkles size={22} className="text-violet-500" />
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">AI qidiruv</h1>
            </div>
            <p className="text-sm text-gray-400 dark:text-white/30 mb-5">Oddiy tilda yozing — AI tushunadi va topadi</p>

            {/* Kirish */}
            <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                    <Sparkles size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
                    <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
                        type="search" autoComplete="off" placeholder="Masalan: 200 minggacha qishki kurtka"
                        className="w-full bg-white dark:bg-white/[0.05] border border-violet-200 dark:border-violet-500/30
                            focus:border-violet-400 dark:focus:border-violet-500/60 rounded-2xl pl-10 pr-4 py-3.5 text-sm
                            text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 outline-none transition" />
                </div>
                <button onClick={() => run()} disabled={loading || !query.trim()}
                    className="px-5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold text-sm
                        disabled:opacity-40 flex items-center gap-2 transition-all">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Qidirish
                </button>
            </div>

            {/* Misollar */}
            {!searched && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {EXAMPLES.map(ex => (
                        <button key={ex} onClick={() => run(ex)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition">
                            {ex}
                        </button>
                    ))}
                </div>
            )}

            {/* Talqin chiplari */}
            {interp && chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className="text-xs text-gray-400 dark:text-white/30">AI tushundi:</span>
                    {chips.map((c, i) => {
                        const Icon = c.icon;
                        return (
                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/60">
                                <Icon size={11} />{c.label}
                            </span>
                        );
                    })}
                </div>
            )}

            {error && <p className="text-amber-600 dark:text-amber-400 text-sm flex items-center gap-1.5 mb-4"><AlertCircle size={14} />{error}</p>}

            {/* Natijalar */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-violet-500" /></div>
            ) : searched && !error ? (
                products.length === 0 ? (
                    <p className="text-center py-16 text-gray-400 dark:text-white/30 text-sm">Mos mahsulot topilmadi</p>
                ) : (
                    <>
                        <p className="text-sm text-gray-400 dark:text-white/25 mb-4">{products.length} ta mahsulot</p>
                        <motion.div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                        </motion.div>
                    </>
                )
            ) : null}
        </div>
    );
}
