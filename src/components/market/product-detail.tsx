"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
    Star, ShoppingCart, Plus, Minus, ChevronRight,
    Package, Truck, RotateCcw, Shield, Loader2,
    CheckCircle2, AlertCircle, TrendingUp, Heart, Pencil, Play,
} from "lucide-react";
import { VerifiedBadge } from "./verified-badge";
import { ProductCard } from "./product-card";
import { ProductReviews } from "./product-reviews";
import { ProductQA } from "./product-qa";

interface Brand { id: string; name: string; slug: string; verified: boolean; logo: string | null; description: string | null; }
interface Product {
    id: string; name: string; slug: string; description: string | null;
    images: string[]; videos?: string[]; price: string; oldPrice: string | null;
    stock: number; sold: number; rating: number; reviewCount: number;
    category: string; subcategory: string | null; isFeatured: boolean;
    brand: Brand;
}

const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);

function fz(v: string | number) { return Number(v).toLocaleString(); }
function disc(p: string, o: string | null) {
    if (!o) return null;
    return Math.round((1 - Number(p) / Number(o)) * 100);
}

export function ProductDetail({ slug }: { slug: string }) {
    const [product, setProduct]   = useState<Product | null>(null);
    const [similar, setSimilar]   = useState<Product[]>([]);
    const [loading, setLoading]   = useState(true);
    const [qty, setQty]           = useState(1);
    const [adding, setAdding]     = useState(false);
    const [added, setAdded]       = useState(false);
    const [addErr, setAddErr]     = useState("");
    const [imgIdx, setImgIdx]     = useState(0);
    const [liked, setLiked]       = useState(false);
    const [isOwner, setIsOwner]   = useState(false);

    useEffect(() => {
        fetch(`/api/market/products/${slug}`)
            .then(r => r.json())
            .then(d => { setProduct(d.product); setSimilar(d.similar ?? []); setIsOwner(d.isOwner ?? false); })
            .finally(() => setLoading(false));
    }, [slug]);

    async function toggleWishlist() {
        if (!product) return;
        setLiked(v => !v); // optimistik
        await fetch("/api/market/wishlist", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: product.id }),
        });
    }

    async function addToCart() {
        if (!product) return;
        setAdding(true); setAddErr("");
        try {
            const res = await fetch("/api/market/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, quantity: qty }),
            });
            const data = await res.json();
            if (!res.ok) { setAddErr(data.error); }
            else { setAdded(true); setTimeout(() => setAdded(false), 3000); }
        } catch { setAddErr("Xatolik"); } finally { setAdding(false); }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 size={28} className="animate-spin text-green-500" />
        </div>
    );
    if (!product) return (
        <div className="text-center py-20 text-gray-400">Mahsulot topilmadi</div>
    );

    const d = disc(product.price, product.oldPrice);
    const inStock = product.stock > 0;

    return (
        <div className="container mx-auto px-4 max-w-6xl py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/30 mb-6">
                <Link href={`/market`} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <Link href={`/market/catalog?cat=${product.category}`} className="hover:text-green-600 dark:hover:text-green-400 transition-colors capitalize">{product.category}</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50 truncate max-w-48">{product.name}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-14">
                {/* Media bloki (rasm + video) */}
                {(() => {
                    const gallery = [...product.images, ...(product.videos ?? [])];
                    const current = gallery[imgIdx];
                    return (
                <div>
                    <motion.div key={imgIdx} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] mb-3">
                        {current ? (
                            isVid(current)
                                ? <video src={current} controls className="w-full h-full object-cover" />
                                : <Image src={current} alt={product.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <ShoppingCart size={48} className="text-gray-200 dark:text-white/10" />
                            </div>
                        )}
                        {d && <div className="absolute top-4 left-4 bg-red-500 text-white font-black text-sm px-3 py-1 rounded-xl">-{d}%</div>}
                    </motion.div>
                    {gallery.length > 1 && (
                        <div className="flex gap-2 flex-wrap">
                            {gallery.map((m, i) => (
                                <button key={i} onClick={() => setImgIdx(i)}
                                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all
                                        ${imgIdx === i ? "border-green-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
                                    {isVid(m)
                                        ? <><video src={m} className="w-full h-full object-cover" /><Play size={16} className="absolute inset-0 m-auto text-white drop-shadow" /></>
                                        : <Image src={m} alt="" width={64} height={64} className="w-full h-full object-cover" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                    );
                })()}

                {/* Ma'lumot bloki */}
                <div className="flex flex-col">
                    {/* Brend */}
                    <Link href={`/market/brand/${product.brand.slug}`}
                        className="flex items-center gap-2 mb-3 group w-fit">
                        <span className="text-sm font-semibold text-gray-500 dark:text-white/40
                            group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {product.brand.name}
                        </span>
                        {product.brand.verified && <VerifiedBadge size={16} />}
                    </Link>

                    {/* Nom + egaga tahrirlash */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                            {product.name}
                        </h1>
                        {isOwner && (
                            <Link href={`/market/product/${product.slug}/edit`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0
                                    bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-xs
                                    hover:bg-green-500/20 transition">
                                <Pencil size={12} /> Tahrirlash
                            </Link>
                        )}
                    </div>

                    {/* Reyting + sotilgan */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center gap-1.5">
                            {[1,2,3,4,5].map(s => (
                                <Star key={s} size={15}
                                    className={s <= Math.round(product.rating)
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-gray-200 dark:text-white/10"} />
                            ))}
                            <span className="text-sm font-bold text-gray-700 dark:text-white/60 ml-1">
                                {product.rating}
                            </span>
                            <span className="text-sm text-gray-400 dark:text-white/25">
                                ({product.reviewCount} sharh)
                            </span>
                        </div>
                        <span className="text-sm text-gray-400 dark:text-white/25">
                            · {fz(product.sold)} sotilgan
                        </span>
                    </div>

                    {/* Narx */}
                    <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-4xl font-black text-transparent bg-clip-text
                            bg-gradient-to-r from-green-600 to-emerald-500
                            dark:from-green-400 dark:to-emerald-300">
                            {fz(product.price)}
                        </span>
                        <span className="text-xl font-bold text-green-500 dark:text-green-400">Ƶ</span>
                        {product.oldPrice && (
                            <span className="text-lg text-gray-400 line-through">{fz(product.oldPrice)} Ƶ</span>
                        )}
                    </div>

                    {/* Tavsif */}
                    {product.description && (
                        <p className="text-gray-600 dark:text-white/50 text-sm leading-relaxed mb-6
                            bg-gray-50/80 dark:bg-white/[0.03] rounded-2xl p-4">
                            {product.description}
                        </p>
                    )}

                    {/* Stock */}
                    <div className={`flex items-center gap-2 mb-5 text-sm font-semibold
                        ${inStock ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        <Package size={15} />
                        {inStock ? `Mavjud (${product.stock} ta)` : "Tugagan"}
                    </div>

                    {/* Miqdor + Savatga */}
                    {inStock && (
                        <div className="flex gap-3 mb-4">
                            {/* Miqdor */}
                            <div className="flex items-center bg-gray-100/80 dark:bg-white/[0.05]
                                border border-gray-200 dark:border-white/[0.08] rounded-2xl overflow-hidden">
                                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                                    className="w-11 h-11 flex items-center justify-center
                                        text-gray-500 hover:text-gray-800 dark:text-white/40 dark:hover:text-white
                                        hover:bg-gray-200/80 dark:hover:bg-white/[0.08] transition-colors">
                                    <Minus size={15} />
                                </button>
                                <span className="w-10 text-center font-bold text-gray-900 dark:text-white text-sm">{qty}</span>
                                <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                                    className="w-11 h-11 flex items-center justify-center
                                        text-gray-500 hover:text-gray-800 dark:text-white/40 dark:hover:text-white
                                        hover:bg-gray-200/80 dark:hover:bg-white/[0.08] transition-colors">
                                    <Plus size={15} />
                                </button>
                            </div>

                            {/* Savatga qo'shish */}
                            <motion.button onClick={addToCart} disabled={adding}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                className={`flex-1 flex items-center justify-center gap-2
                                    rounded-2xl font-bold text-sm transition-all duration-200
                                    ${added
                                        ? "bg-emerald-500 text-white"
                                        : "bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-lg shadow-green-500/25"
                                    }`}>
                                {adding ? <Loader2 size={16} className="animate-spin" />
                                    : added ? <><CheckCircle2 size={16} /> Savatda!</>
                                    : <><ShoppingCart size={16} /> Savatga qo'shish</>}
                            </motion.button>

                            {/* Sevimli */}
                            <motion.button onClick={toggleWishlist}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center
                                    border transition-all duration-200
                                    ${liked
                                        ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
                                        : "bg-gray-100/80 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.08] hover:border-red-300"}`}>
                                <Heart size={18} className={liked ? "text-red-500 fill-red-500" : "text-gray-400 dark:text-white/30"} />
                            </motion.button>
                        </div>
                    )}

                    {addErr && (
                        <p className="text-red-500 text-sm flex items-center gap-1.5 mb-3">
                            <AlertCircle size={13} /> {addErr}
                        </p>
                    )}

                    {/* Kafolatlar */}
                    <div className="grid grid-cols-3 gap-3 mt-2">
                        {[
                            { icon: Truck,     label: "Yetkazib berish" },
                            { icon: RotateCcw, label: "14 kun qaytarish" },
                            { icon: Shield,    label: "Kafolat" },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex flex-col items-center gap-1.5 p-3
                                bg-gray-50/80 dark:bg-white/[0.03]
                                border border-gray-100 dark:border-white/[0.05]
                                rounded-2xl text-center">
                                <Icon size={18} className="text-green-500" />
                                <span className="text-xs text-gray-500 dark:text-white/35 font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Savol-javob */}
            <ProductQA productId={product.id} />

            {/* Sharhlar */}
            <ProductReviews productId={product.id} />

            {/* O'xshash mahsulotlar */}
            {similar.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-5">
                        <TrendingUp size={18} className="text-green-500" />
                        <h2 className="font-bold text-gray-900 dark:text-white text-lg">O'xshash mahsulotlar</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {similar.map((p, i) => <ProductCard key={p.id} product={p as any} index={i} compact />)}
                    </div>
                </section>
            )}
        </div>
    );
}
