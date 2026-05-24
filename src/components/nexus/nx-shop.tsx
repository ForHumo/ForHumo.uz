"use client";

import { useState } from "react";
import { X, ShoppingBag, Star, Heart, Package, ChevronRight, Search, Filter, Check, Truck } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock products
// ─────────────────────────────────────────────────────────────────────────────
type Category = "all" | "merch" | "digital" | "music" | "courses";

interface Product {
    id: string;
    name: string;
    creator: string;
    price: number;
    image: string;
    category: Category;
    rating: number;
    reviews: number;
    badge?: string;
    digital: boolean;
}

const PRODUCTS: Product[] = [
    { id: "p1",  name: "Nexus Classic Futbolka",  creator: "Nexus Shop",       price: 89000,  image: "https://picsum.photos/seed/sh1/300/300",  category: "merch",   rating: 4.8, reviews: 234, badge: "Bestseller", digital: false },
    { id: "p2",  name: "Lo-fi beats 2025 Pack",   creator: "Shahlo Musiqasi",  price: 49000,  image: "https://picsum.photos/seed/sh2/300/300",  category: "music",   rating: 4.9, reviews: 89,  badge: "Yangi",      digital: true  },
    { id: "p3",  name: "React kurs — Boshlang'ich",creator: "IT Academy UZ",   price: 299000, image: "https://picsum.photos/seed/sh3/300/300",  category: "courses", rating: 4.7, reviews: 512,                  digital: true  },
    { id: "p4",  name: "Nexus Cap (shapka)",       creator: "Nexus Shop",       price: 65000,  image: "https://picsum.photos/seed/sh4/300/300",  category: "merch",   rating: 4.6, reviews: 178,                  digital: false },
    { id: "p5",  name: "Preset to'plami — Kinematik", creator: "Jasur Umarov", price: 79000,  image: "https://picsum.photos/seed/sh5/300/300",  category: "digital", rating: 4.9, reviews: 67,  badge: "Top",        digital: true  },
    { id: "p6",  name: "UI/UX Dizayn kurs",        creator: "IT Academy UZ",   price: 399000, image: "https://picsum.photos/seed/sh6/300/300",  category: "courses", rating: 4.8, reviews: 298,                  digital: true  },
    { id: "p7",  name: "O'zbek taom retseptlar",   creator: "Nexus Kitchen",    price: 35000,  image: "https://picsum.photos/seed/sh7/300/300",  category: "digital", rating: 4.5, reviews: 145,                  digital: true  },
    { id: "p8",  name: "Nexus Hoodie (to'q ko'k)", creator: "Nexus Shop",       price: 149000, image: "https://picsum.photos/seed/sh8/300/300",  category: "merch",   rating: 4.7, reviews: 392, badge: "Chegirma",   digital: false },
];

const CATS: { key: Category; label: string }[] = [
    { key: "all",     label: "Barchasi"  },
    { key: "merch",   label: "Kiyimlar"  },
    { key: "digital", label: "Raqamli"   },
    { key: "music",   label: "Musiqa"    },
    { key: "courses", label: "Kurslar"   },
];

function fmtPrice(n: number) {
    return n.toLocaleString("uz-UZ") + " so'm";
}

// ─────────────────────────────────────────────────────────────────────────────
// NxShop
// ─────────────────────────────────────────────────────────────────────────────
export function NxShop() {
    const { shopOpen, setShopOpen } = useNxPlayer();
    const [cat, setCat] = useState<Category>("all");
    const [q, setQ] = useState("");
    const [cart, setCart] = useState<Set<string>>(new Set());
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [detail, setDetail] = useState<Product | null>(null);
    const [added, setAdded] = useState<string | null>(null);

    const filtered = PRODUCTS.filter(p =>
        (cat === "all" || p.category === cat) &&
        (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.creator.toLowerCase().includes(q.toLowerCase()))
    );

    const addToCart = (id: string) => {
        setCart(prev => new Set([...prev, id]));
        setAdded(id);
        setTimeout(() => setAdded(null), 2000);
    };

    const toggleLike = (id: string) => {
        setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    if (!shopOpen) return null;

    // Product detail view
    if (detail) {
        return (
            <div className="fixed inset-0 z-[60] flex flex-col"
                style={{ background: "rgba(8,12,32,0.99)" }}>
                <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <button onClick={() => setDetail(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <ChevronRight className="w-4 h-4 text-white rotate-180" />
                    </button>
                    <p className="text-sm font-black text-white flex-1 truncate">{detail.name}</p>
                    <button onClick={() => toggleLike(detail.id)}>
                        <Heart className={`w-5 h-5 transition-colors ${liked.has(detail.id) ? "fill-red-500" : ""}`}
                            style={{ color: liked.has(detail.id) ? "#EF4444" : "rgba(140,160,210,0.60)" }} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    <img src={detail.image} alt={detail.name} className="w-full object-cover" style={{ maxHeight: 280 }} />
                    <div className="p-5">
                        {detail.badge && (
                            <span className="inline-block text-[9px] px-2 py-0.5 rounded-full font-black mb-2"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)", color: "white" }}>
                                {detail.badge}
                            </span>
                        )}
                        <h2 className="text-xl font-black text-white mb-1">{detail.name}</h2>
                        <p className="text-sm mb-3" style={{ color: "rgba(140,160,210,0.70)" }}>
                            {detail.creator} tomonidan
                        </p>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-3.5 h-3.5 fill-current"
                                        style={{ color: i < Math.floor(detail.rating) ? "#F59E0B" : "rgba(80,100,150,0.30)" }} />
                                ))}
                            </div>
                            <span className="text-xs font-bold" style={{ color: "#F59E0B" }}>{detail.rating}</span>
                            <span className="text-xs" style={{ color: "rgba(80,100,150,0.60)" }}>({detail.reviews} ta sharh)</span>
                        </div>
                        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            {detail.digital
                                ? <Package className="w-4 h-4 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                                : <Truck className="w-4 h-4 flex-shrink-0" style={{ color: "#10B981" }} />
                            }
                            <p className="text-xs" style={{ color: "rgba(180,200,240,0.80)" }}>
                                {detail.digital ? "Raqamli mahsulot — xarid qilgach darhol yuklanadi" : "Jismoniy mahsulot — 3-5 ish kuni ichida yetkaziladi"}
                            </p>
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-2xl font-black text-white">{fmtPrice(detail.price)}</span>
                        </div>
                        <button
                            onClick={() => { addToCart(detail.id); setDetail(null); }}
                            className="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all duration-200"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                            {cart.has(detail.id) ? "Savatda bor" : "Savatga qo'shish"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setShopOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[92vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "94vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)" }}>
                            <ShoppingBag className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Nexus Do'kon</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                {cart.size} ta savat · {PRODUCTS.length} ta mahsulot
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {cart.size > 0 && (
                            <div className="relative">
                                <button className="w-8 h-8 flex items-center justify-center rounded-full"
                                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                    <ShoppingBag className="w-4 h-4 text-white" />
                                </button>
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                                    style={{ background: "#EF4444" }}>{cart.size}</div>
                            </div>
                        )}
                        <button onClick={() => setShopOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="px-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                        <input value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Mahsulot yoki yaratuvchi qidirish..."
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none" />
                        <Filter className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(80,100,150,0.50)" }} />
                    </div>
                </div>

                {/* Category chips */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {CATS.map(c => (
                        <button key={c.key} onClick={() => setCat(c.key)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                            style={cat === c.key ? {
                                background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>
                            {c.label}
                        </button>
                    ))}
                </div>

                {/* Products grid */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    <div className="grid grid-cols-2 gap-3">
                        {filtered.map(product => {
                            const isLiked = liked.has(product.id);
                            const isAdded = added === product.id;
                            const inCart = cart.has(product.id);
                            return (
                                <div key={product.id}
                                    className="flex flex-col rounded-2xl overflow-hidden"
                                    style={{ background: "rgba(11,18,40,0.70)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    {/* Image */}
                                    <div className="relative">
                                        <button onClick={() => setDetail(product)} className="block w-full">
                                            <img src={product.image} alt={product.name}
                                                className="w-full object-cover" style={{ height: 140 }} />
                                        </button>
                                        {product.badge && (
                                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[8px] font-black text-white"
                                                style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                                                {product.badge}
                                            </div>
                                        )}
                                        {product.digital && (
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center"
                                                style={{ background: "rgba(0,0,0,0.60)" }}>
                                                <Package className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <button onClick={() => toggleLike(product.id)}
                                            className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                                            style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(4px)" }}>
                                            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-red-500" : ""}`}
                                                style={{ color: isLiked ? "#EF4444" : "white" }} />
                                        </button>
                                    </div>
                                    {/* Info */}
                                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                                        <p className="text-xs font-bold text-white leading-snug line-clamp-2">{product.name}</p>
                                        <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>{product.creator}</p>
                                        <div className="flex items-center gap-1 mb-1">
                                            <Star className="w-2.5 h-2.5 fill-current" style={{ color: "#F59E0B" }} />
                                            <span className="text-[9px] font-bold" style={{ color: "#F59E0B" }}>{product.rating}</span>
                                            <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.50)" }}>({product.reviews})</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto">
                                            <span className="text-xs font-black text-white">{fmtPrice(product.price)}</span>
                                            <button
                                                onClick={() => addToCart(product.id)}
                                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all duration-200"
                                                style={isAdded || inCart ? {
                                                    background: "rgba(16,185,129,0.20)",
                                                    color: "#10B981",
                                                } : {
                                                    background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
                                                    color: "white",
                                                }}>
                                                {isAdded ? <Check className="w-3 h-3" /> : inCart ? "Savat" : "Sotib ol"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
