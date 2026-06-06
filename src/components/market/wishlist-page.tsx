"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Heart, ChevronRight, Loader2 } from "lucide-react";
import { ProductCard } from "./product-card";

interface WishProduct {
    id: string; name: string; slug: string; price: string; oldPrice: string | null;
    images: string[]; rating: number; reviewCount: number; sold: number; isFeatured: boolean; category: string;
    brand: { name: string; slug: string; verified: boolean };
}

export function WishlistPage() {
    const [products, setProducts] = useState<WishProduct[]>([]);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        fetch("/api/market/wishlist")
            .then(r => r.json())
            .then(d => setProducts((d.items ?? []).map((i: { product: WishProduct }) => i.product)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="container mx-auto px-4 max-w-6xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">Sevimlilar</span>
            </nav>

            <div className="flex items-center gap-3 mb-6">
                <Heart size={20} className="text-red-500 fill-red-500" />
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Sevimlilar</h1>
                {!loading && <span className="text-gray-400 dark:text-white/30 text-sm font-medium">({products.length} ta)</span>}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-green-500" /></div>
            ) : !products.length ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center py-20">
                    <Heart size={48} className="text-gray-200 dark:text-white/10 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-white/40 font-semibold mb-2">Hali sevimli mahsulotlar yo'q</p>
                    <p className="text-gray-400 dark:text-white/25 text-sm mb-6">Mahsulot kartasidagi yurakcha belgisini bosing</p>
                    <Link href="/market/catalog"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                            bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm">
                        Katalogga o'tish
                    </Link>
                </motion.div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {products.map((p, i) => (
                        <ProductCard key={p.id} product={p} index={i} initialLiked={true} />
                    ))}
                </div>
            )}
        </div>
    );
}
