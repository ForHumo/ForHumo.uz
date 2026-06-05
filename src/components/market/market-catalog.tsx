"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    SlidersHorizontal, ChevronRight, Loader2,
    Search, X, ArrowUpDown,
} from "lucide-react";
import { MARKET_CATEGORIES } from "@/lib/market-categories";
import { ProductCard } from "./product-card";

type SortKey = "popular" | "price_asc" | "price_desc" | "rating" | "newest";

interface Product {
    id: string; name: string; slug: string; price: string; oldPrice: string | null;
    images: string[]; rating: number; reviewCount: number; sold: number; isFeatured: boolean;
    category: string;
    brand: { name: string; slug: string; verified: boolean };
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "popular",    label: "Mashhurlik bo'yicha" },
    { key: "price_asc",  label: "Arzon avval" },
    { key: "price_desc", label: "Qimmat avval" },
    { key: "rating",     label: "Reyting bo'yicha" },
    { key: "newest",     label: "Yangi avval" },
];

export function MarketCatalog() {
    const locale       = useLocale();
    const params       = useSearchParams();
    const router       = useRouter();

    const catSlug  = params.get("cat")  ?? "";
    const subSlug  = params.get("sub")  ?? "";
    const featured = params.get("featured") === "1";

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState(params.get("q") ?? "");
    const [sort, setSort]         = useState<SortKey>("popular");
    const [activeCat, setActiveCat] = useState(catSlug);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        const sp = new URLSearchParams();
        if (activeCat)  sp.set("cat", activeCat);
        if (subSlug)    sp.set("sub", subSlug);
        if (featured)   sp.set("featured", "1");
        if (search)     sp.set("q", search);
        sp.set("limit", "60");
        const data = await fetch(`/api/market/products?${sp}`).then(r => r.json());
        let prods: Product[] = data.products ?? [];

        // Client-side sort
        prods = [...prods].sort((a, b) => {
            if (sort === "price_asc")  return Number(a.price) - Number(b.price);
            if (sort === "price_desc") return Number(b.price) - Number(a.price);
            if (sort === "rating")     return b.rating - a.rating;
            if (sort === "popular")    return b.sold - a.sold;
            return 0;
        });
        setProducts(prods);
        setLoading(false);
    }, [activeCat, subSlug, featured, search, sort]);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const currentCat = MARKET_CATEGORIES.find(c => c.slug === activeCat);

    return (
        <div className="container mx-auto px-4 max-w-6xl py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href={`/${locale}/market`} className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">
                    {currentCat?.name ?? "Barcha mahsulotlar"}
                </span>
            </nav>

            <div className="flex gap-8">
                {/* ── Sidebar ── */}
                <aside className="hidden lg:block w-56 shrink-0">
                    <div className="sticky top-20">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Kategoriyalar</h3>
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveCat("")}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-all
                                    ${!activeCat
                                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold"
                                        : "text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04]"}`}>
                                Barcha kategoriyalar
                            </button>
                            {MARKET_CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                const active = activeCat === cat.slug;
                                return (
                                    <div key={cat.slug}>
                                        <button
                                            onClick={() => setActiveCat(cat.slug)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-all
                                                ${active
                                                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold"
                                                    : "text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04]"}`}>
                                            <Icon size={14} style={{ color: active ? cat.color : undefined }} className={active ? "" : "text-gray-400 dark:text-white/20"} />
                                            {cat.name}
                                        </button>
                                        {active && cat.subcategories.map(sub => (
                                            <Link key={sub.slug}
                                                href={`/${locale}/market/catalog?cat=${cat.slug}&sub=${sub.slug}`}
                                                className={`block pl-9 pr-3 py-1.5 text-xs rounded-xl transition-all
                                                    ${subSlug === sub.slug
                                                        ? "text-green-600 dark:text-green-400 font-semibold"
                                                        : "text-gray-500 dark:text-white/30 hover:text-green-600 dark:hover:text-green-400"}`}>
                                                {sub.name}
                                            </Link>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* ── Asosiy kontent ── */}
                <div className="flex-1 min-w-0">
                    {/* Toolbar */}
                    <div className="flex items-center gap-3 mb-6 flex-wrap">
                        {/* Qidiruv */}
                        <div className="relative flex-1 min-w-48">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && loadProducts()}
                                placeholder="Qidirish..."
                                className="w-full bg-gray-50/90 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                    focus:border-green-400 dark:focus:border-green-500/50
                                    rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-white
                                    placeholder:text-gray-400 dark:placeholder:text-white/20 outline-none transition" />
                            {search && (
                                <button onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Sort */}
                        <div className="relative">
                            <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                                bg-gray-50/90 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]">
                                <ArrowUpDown size={13} className="text-gray-400" />
                                <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
                                    className="bg-transparent text-sm text-gray-700 dark:text-white/60 outline-none cursor-pointer pr-1">
                                    {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Natija soni */}
                        <span className="text-sm text-gray-400 dark:text-white/25 ml-auto">
                            {loading ? "" : `${products.length} ta mahsulot`}
                        </span>
                    </div>

                    {/* Mahsulotlar grid */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-white/[0.03] animate-pulse" />
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20">
                            <SlidersHorizontal size={36} className="text-gray-200 dark:text-white/10 mx-auto mb-3" />
                            <p className="text-gray-400 dark:text-white/30 text-sm">Mahsulot topilmadi</p>
                        </div>
                    ) : (
                        <motion.div
                            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
