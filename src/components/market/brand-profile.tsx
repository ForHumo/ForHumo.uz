"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
    Store, ChevronRight, Loader2, Package, ShoppingBag,
    Star, Users, Calendar,
} from "lucide-react";
import { VerifiedBadge } from "./verified-badge";
import { ProductCard } from "./product-card";
import { BrandReviews } from "./brand-reviews";
import { getCategoryBySlug } from "@/lib/market-categories";

interface Product {
    id: string; name: string; slug: string; price: string; oldPrice: string | null;
    images: string[]; rating: number; reviewCount: number; sold: number; isFeatured: boolean; category: string;
    brand: { name: string; slug: string; verified: boolean };
}
interface BrandData {
    brand: {
        id: string; slug: string; name: string; logo: string | null;
        description: string | null; category: string | null; categories?: string[]; verified: boolean; createdAt: string;
    };
    owner: { name: string | null; username: string | null; image: string | null } | null;
    products: Product[];
    stats: { productCount: number; totalSales: number; totalReviews: number; avgRating: number };
}

function fz(v: number | string) { return Number(v).toLocaleString(); }

export function BrandProfile({ slug }: { slug: string }) {
    const [data, setData] = useState<BrandData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        fetch(`/api/market/brands/${slug}`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setData)
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return (
        <div className="flex justify-center py-32"><Loader2 size={28} className="animate-spin text-green-500" /></div>
    );
    if (notFound || !data) return (
        <div className="text-center py-32">
            <Store size={48} className="text-gray-200 dark:text-white/10 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-white/40">Brend topilmadi</p>
        </div>
    );

    const { brand, owner, products, stats } = data;
    const catSlugs = (brand.categories?.length ? brand.categories : (brand.category ? [brand.category] : []));
    const cats = catSlugs.map(getCategoryBySlug).filter(Boolean);

    const STAT_ITEMS = [
        { icon: Package,    label: "Mahsulot",  value: fz(stats.productCount) },
        { icon: ShoppingBag,label: "Sotuvlar",  value: `${fz(stats.totalSales)}+` },
        { icon: Star,       label: "Reyting",   value: stats.avgRating || "—" },
        { icon: Users,      label: "Sharhlar",  value: fz(stats.totalReviews) },
    ];

    return (
        <div>
            {/* Banner */}
            <div className="relative h-40 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 overflow-hidden">
                <motion.div className="absolute inset-0 opacity-20"
                    animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    style={{
                        backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)",
                        backgroundSize: "200% 200%",
                    }} />
            </div>

            <div className="container mx-auto px-4 max-w-6xl">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-xs text-gray-400 pt-4">
                    <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                    <ChevronRight size={11} />
                    <span className="text-gray-600 dark:text-white/50">{brand.name}</span>
                </nav>

                {/* Brend header */}
                <div className="flex items-start gap-4 -mt-12 relative z-10 mb-6">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0
                        bg-white dark:bg-[#0a1a0d] border-4 border-white dark:border-[#050F07]
                        shadow-xl flex items-center justify-center">
                        {brand.logo ? (
                            <Image src={brand.logo} alt={brand.name} width={96} height={96} className="w-full h-full object-cover" />
                        ) : (
                            <Store size={36} className="text-green-500" />
                        )}
                    </div>
                    <div className="pt-14">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{brand.name}</h1>
                            {brand.verified && <VerifiedBadge size={18} />}
                        </div>
                        {cats.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {cats.map(c => c && (
                                    <span key={c.slug} className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium">
                                        {c.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tavsif */}
                {brand.description && (
                    <p className="text-gray-600 dark:text-white/50 text-sm mb-6 max-w-2xl">{brand.description}</p>
                )}

                {/* Statistika */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {STAT_ITEMS.map(s => (
                        <div key={s.label} className="bg-white/70 dark:bg-white/[0.03]
                            border border-gray-100 dark:border-white/[0.06] rounded-2xl p-4 text-center">
                            <s.icon size={18} className="text-green-500 mx-auto mb-1.5" />
                            <p className="text-xl font-black text-gray-900 dark:text-white">{s.value}</p>
                            <p className="text-xs text-gray-400 dark:text-white/30">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Egasi + sana */}
                <div className="flex items-center gap-4 mb-8 text-xs text-gray-400 dark:text-white/30">
                    {owner && (
                        <span className="flex items-center gap-1.5">
                            <Users size={12} />
                            {owner.name ?? `@${owner.username}`}
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        Humo Market'da: {new Date(brand.createdAt).toLocaleDateString("uz-UZ")}
                    </span>
                </div>

                {/* Mahsulotlar */}
                <div className="flex items-center gap-2 mb-5">
                    <Package size={18} className="text-green-500" />
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Mahsulotlar</h2>
                </div>
                {products.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-white/25 py-10 text-center">Hali mahsulot yo'q</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pb-8">
                        {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                    </div>
                )}

                {/* Brend sharhlari */}
                <BrandReviews slug={brand.slug} />
            </div>
        </div>
    );
}
