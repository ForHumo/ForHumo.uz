"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useRouter } from "@/i18n/routing";
import Image from "next/image";
import { Star, ShoppingCart, Flame, CheckCircle2, Loader2, Heart } from "lucide-react";
import { VerifiedBadge } from "./verified-badge";
import { formatMoney, type Currency } from "@/lib/money";

interface Product {
    id: string; name: string; slug: string; price: string; oldPrice: string | null;
    currency?: Currency;
    images: string[]; rating: number; reviewCount: number; sold: number; isFeatured: boolean;
    stock?: number;
    brand: { name: string; slug: string; verified: boolean };
}
function disc(p: string, o: string | null) {
    if (!o) return null;
    return Math.round((1 - Number(p) / Number(o)) * 100);
}

export function ProductCard({
    product, index = 0, compact = false, initialLiked = false,
}: { product: Product; index?: number; compact?: boolean; initialLiked?: boolean }) {
    const router = useRouter();
    const d = disc(product.price, product.oldPrice);
    const out = (product.stock ?? 1) <= 0;
    const [adding, setAdding]   = useState(false);
    const [added, setAdded]     = useState(false);
    const [liked, setLiked]     = useState(initialLiked);
    const [liking, setLiking]   = useState(false);

    useEffect(() => { setLiked(initialLiked); }, [initialLiked]);

    async function toggleWishlist(e: React.MouseEvent) {
        e.preventDefault();
        setLiking(true);
        try {
            const res = await fetch("/api/market/wishlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id }),
            });
            if (res.ok) { const d = await res.json(); setLiked(d.liked); }
        } finally { setLiking(false); }
    }

    async function addToCart(e: React.MouseEvent) {
        e.preventDefault();
        if (out) return;
        setAdding(true);
        try {
            const res = await fetch("/api/market/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, quantity: 1 }),
            });
            if (res.ok) { setAdded(true); setTimeout(() => setAdded(false), 2500); }
            else {
                const data = await res.json().catch(() => ({}));
                // Variant tanlash kerak — mahsulot sahifasiga o'tamiz
                if (data.error && /variant/i.test(data.error)) router.push(`/market/product/${product.slug}`);
            }
        } finally { setAdding(false); }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ y: -3 }}
            className="group relative bg-white/70 dark:bg-white/[0.03]
                border border-gray-100 dark:border-white/[0.05]
                hover:border-green-200 dark:hover:border-green-700/30
                hover:shadow-lg hover:shadow-green-500/8
                backdrop-blur-sm rounded-2xl overflow-hidden
                transition-all duration-300"
        >
            {/* Rasm */}
            <Link href={`/market/product/${product.slug}`}>
                <div className={`relative ${compact ? "h-32" : "h-44"} bg-gray-50 dark:bg-white/[0.02] overflow-hidden`}>
                    {product.images[0] ? (
                        <Image src={product.images[0]} alt={product.name} fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart size={28} className="text-gray-200 dark:text-white/10" />
                        </div>
                    )}
                    {d && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg">
                            -{d}%
                        </div>
                    )}
                    {product.isFeatured && !compact && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Flame size={9} />Top
                        </div>
                    )}
                    {/* Heart tugmasi */}
                    {!compact && (
                        <motion.button
                            onClick={toggleWishlist}
                            disabled={liking}
                            whileTap={{ scale: 0.8 }}
                            className={`absolute top-2 ${product.isFeatured ? "right-14" : "right-2"}
                                w-7 h-7 rounded-full flex items-center justify-center
                                bg-white/80 dark:bg-black/40 backdrop-blur-sm
                                shadow-sm transition-all duration-200
                                opacity-0 group-hover:opacity-100`}
                        >
                            <Heart size={14}
                                className={liked ? "text-red-500 fill-red-500" : "text-gray-400"}
                            />
                        </motion.button>
                    )}
                    {out && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="bg-white/90 dark:bg-black/70 text-gray-800 dark:text-white text-xs font-bold px-3 py-1 rounded-lg">Tugadi</span>
                        </div>
                    )}
                </div>
            </Link>

            <div className={compact ? "p-2.5" : "p-4"}>
                {/* Brend — bosilsa brend sahifasi ochiladi */}
                <div className="flex items-center gap-1 mb-1">
                    <Link href={`/market/brand/${product.brand.slug}`}
                        className={`${compact ? "text-[10px]" : "text-xs"} text-gray-400 dark:text-white/25 font-medium truncate
                            hover:text-green-600 dark:hover:text-green-400 transition-colors`}>
                        {product.brand.name}
                    </Link>
                    {product.brand.verified && <VerifiedBadge size={compact ? 10 : 12} />}
                </div>

                {/* Nom */}
                <Link href={`/market/product/${product.slug}`}>
                    <p className={`text-gray-900 dark:text-white font-semibold line-clamp-2 leading-tight mb-2
                        group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors
                        ${compact ? "text-xs" : "text-sm"}`}>
                        {product.name}
                    </p>
                </Link>

                {/* Reyting */}
                {!compact && (
                    <div className="flex items-center gap-1 mb-2.5">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-white/50">{product.rating}</span>
                        <span className="text-xs text-gray-300 dark:text-white/20">({product.reviewCount})</span>
                    </div>
                )}

                {/* Narx + Cart */}
                <div className="flex items-center justify-between gap-1">
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className={`font-black text-transparent bg-clip-text
                                bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300
                                ${compact ? "text-sm" : "text-base"}`}>
                                {formatMoney(Number(product.price), product.currency ?? "UZS")}
                            </span>
                        </div>
                        {product.oldPrice && !compact && (
                            <span className="text-[10px] text-gray-400 line-through">{formatMoney(Number(product.oldPrice), product.currency ?? "UZS")}</span>
                        )}
                    </div>
                    <motion.button onClick={addToCart} disabled={adding || out}
                        whileTap={{ scale: out ? 1 : 0.85 }}
                        title={out ? "Mahsulot tugadi" : "Savatga"}
                        className={`${compact ? "w-7 h-7" : "w-9 h-9"} rounded-xl flex items-center justify-center transition-all
                            ${out ? "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-white/25 cursor-not-allowed"
                                : `text-white shadow-sm shadow-green-500/20 ${added ? "bg-emerald-500" : "bg-green-500 hover:bg-green-400"}`}`}>
                        {adding ? <Loader2 size={compact ? 11 : 14} className="animate-spin" />
                            : added ? <CheckCircle2 size={compact ? 11 : 14} />
                            : <ShoppingCart size={compact ? 11 : 14} />}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
