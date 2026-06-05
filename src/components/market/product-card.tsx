"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { Star, ShoppingCart, Flame, CheckCircle2, Loader2 } from "lucide-react";
import { VerifiedBadge } from "./verified-badge";

interface Product {
    id: string; name: string; slug: string; price: string; oldPrice: string | null;
    images: string[]; rating: number; reviewCount: number; sold: number; isFeatured: boolean;
    brand: { name: string; slug: string; verified: boolean };
}

function fz(v: string | number) { return Number(v).toLocaleString(); }
function disc(p: string, o: string | null) {
    if (!o) return null;
    return Math.round((1 - Number(p) / Number(o)) * 100);
}

export function ProductCard({
    product, index = 0, compact = false,
}: { product: Product; index?: number; compact?: boolean }) {
    const locale = useLocale();
    const d = disc(product.price, product.oldPrice);
    const [adding, setAdding] = useState(false);
    const [added, setAdded]   = useState(false);

    async function addToCart(e: React.MouseEvent) {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await fetch("/api/market/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, quantity: 1 }),
            });
            if (res.ok) { setAdded(true); setTimeout(() => setAdded(false), 2500); }
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
            <Link href={`/${locale}/market/product/${product.slug}`}>
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
                </div>
            </Link>

            <div className={compact ? "p-2.5" : "p-4"}>
                {/* Brend */}
                <div className="flex items-center gap-1 mb-1">
                    <span className={`${compact ? "text-[10px]" : "text-xs"} text-gray-400 dark:text-white/25 font-medium truncate`}>
                        {product.brand.name}
                    </span>
                    {product.brand.verified && <VerifiedBadge size={compact ? 10 : 12} />}
                </div>

                {/* Nom */}
                <Link href={`/${locale}/market/product/${product.slug}`}>
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
                                {fz(product.price)}
                            </span>
                            <span className={`font-bold text-green-500 dark:text-green-400 ${compact ? "text-xs" : "text-sm"}`}>Ƶ</span>
                        </div>
                        {product.oldPrice && !compact && (
                            <span className="text-[10px] text-gray-400 line-through">{fz(product.oldPrice)} Ƶ</span>
                        )}
                    </div>
                    <motion.button onClick={addToCart} disabled={adding}
                        whileTap={{ scale: 0.85 }}
                        className={`${compact ? "w-7 h-7" : "w-9 h-9"} rounded-xl flex items-center justify-center
                            ${added ? "bg-emerald-500" : "bg-green-500 hover:bg-green-400"}
                            text-white shadow-sm shadow-green-500/20 transition-all`}>
                        {adding ? <Loader2 size={compact ? 11 : 14} className="animate-spin" />
                            : added ? <CheckCircle2 size={compact ? 11 : 14} />
                            : <ShoppingCart size={compact ? 11 : 14} />}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
