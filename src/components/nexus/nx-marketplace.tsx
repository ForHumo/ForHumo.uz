"use client";

import { useState } from "react";
import {
    X, ShoppingBag, Search, Star, Heart, Tag,
    ChevronRight, Filter, ArrowLeft, Truck, Shield,
    Package, Plus, Minus, BadgeCheck,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar va Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface Product {
    id: string; name: string; seller: string; sellerSeed: string;
    price: number; oldPrice?: number; image: string;
    rating: number; reviews: number; category: string;
    tag?: string; verified?: boolean; stock: number;
}

const PRODUCTS: Product[] = [
    { id:"p1",  name:"Humo Nexus Pro Headphones", seller:"Humo Store",     sellerSeed:"humo",    price:890000,  oldPrice:1200000, image:"https://picsum.photos/seed/prod1/400/400",  rating:4.8, reviews:234, category:"Elektronika", tag:"Trendda",  verified:true,  stock:15 },
    { id:"p2",  name:"O'zbek San'at Ko'ylagi",    seller:"Madina Fashion",  sellerSeed:"madina",  price:245000,  oldPrice:300000,  image:"https://picsum.photos/seed/prod2/400/400",  rating:4.6, reviews:89,  category:"Kiyim",      tag:"Yangi",    verified:false, stock:42 },
    { id:"p3",  name:"Nexus Smart Band 2",         seller:"Tech UZ",         sellerSeed:"tech",    price:650000,  oldPrice:780000,  image:"https://picsum.photos/seed/prod3/400/400",  rating:4.7, reviews:156, category:"Elektronika", tag:"Chegirma", verified:true,  stock:8  },
    { id:"p4",  name:"Qo'l ishlangan kosa to'plam",seller:"Kamola Craft",   sellerSeed:"kamola",  price:180000,               image:"https://picsum.photos/seed/prod4/400/400",  rating:5.0, reviews:43,  category:"Uy-ro'zg'or",                 verified:false, stock:6  },
    { id:"p5",  name:"Elektron Kitob to'plami",    seller:"Humo Books",      sellerSeed:"books",   price:120000,               image:"https://picsum.photos/seed/prod5/400/400",  rating:4.5, reviews:201, category:"Kitob",       tag:"Mashhur",  verified:true,  stock:999},
    { id:"p6",  name:"Organik Sovun seti",          seller:"Natural UZ",      sellerSeed:"natural", price:89000,   oldPrice:110000,  image:"https://picsum.photos/seed/prod6/400/400",  rating:4.9, reviews:67,  category:"Go'zallik",  tag:"Chegirma", verified:false, stock:28 },
    { id:"p7",  name:"Gaming Chair UZ Edition",     seller:"Sport UZ",        sellerSeed:"sport",   price:2100000,             image:"https://picsum.photos/seed/prod7/400/400",  rating:4.4, reviews:38,  category:"Sport",                       verified:false, stock:4  },
    { id:"p8",  name:"UZ Flag Backpack",             seller:"Style UZ",        sellerSeed:"style",   price:340000,  oldPrice:420000,  image:"https://picsum.photos/seed/prod8/400/400",  rating:4.7, reviews:112, category:"Aksesuar",   tag:"Trendda",  verified:false, stock:22 },
    { id:"p9",  name:"Nexus Wireless Charger",       seller:"Tech UZ",         sellerSeed:"tech",    price:280000,               image:"https://picsum.photos/seed/prod9/400/400",  rating:4.6, reviews:78,  category:"Elektronika", tag:"Yangi",    verified:true,  stock:35 },
    { id:"p10", name:"Milliy Naqsh Gilam",           seller:"Bukhara Craft",   sellerSeed:"bukhara", price:890000,               image:"https://picsum.photos/seed/prod10/400/400", rating:4.9, reviews:22,  category:"Uy-ro'zg'or",                 verified:true,  stock:3  },
];

const CATEGORIES = ["Hammasi", "Elektronika", "Kiyim", "Kitob", "Sport", "Go'zallik", "Uy-ro'zg'or", "Aksesuar"];

function fmt(n: number) {
    return n.toLocaleString("uz-UZ") + " so'm";
}

// ─────────────────────────────────────────────────────────────────────────────
// Mahsulot detay sahifasi
// ─────────────────────────="────────────────────────────────────
function ProductDetail({ product, onBack }: { product: Product; onBack: () => void }) {
    const [qty,     setQty]     = useState(1);
    const [liked,   setLiked]   = useState(false);
    const [inCart,  setInCart]  = useState(false);

    const discount = product.oldPrice
        ? Math.round((1 - product.price / product.oldPrice) * 100)
        : 0;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3 flex-shrink-0">
                <button onClick={onBack}
                    className="w-8 h-8 flex items-center justify-center rounded-full"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <p className="text-[10px] font-black uppercase tracking-widest flex-1"
                    style={{ color: "rgba(43,62,232,0.55)" }}>{product.category}</p>
                <button onClick={() => setLiked(l => !l)}>
                    <Heart className="w-5 h-5 transition-colors duration-200"
                        style={{ color: liked ? "#EF4444" : "rgba(100,120,170,0.60)", fill: liked ? "#EF4444" : "none" }} />
                </button>
            </div>

            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {/* Product image */}
                <div className="mx-5 mb-4 rounded-2xl overflow-hidden aspect-square"
                    style={{ border: "1px solid rgba(43,62,232,0.20)" }}>
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>

                <div className="px-5">
                    {/* Tag */}
                    {product.tag && (
                        <span className="inline-block px-2.5 py-1 rounded-xl text-[9px] font-black mb-2"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white" }}>
                            {product.tag}
                        </span>
                    )}

                    {/* Name */}
                    <h2 className="text-lg font-black text-white leading-snug mb-2">{product.name}</h2>

                    {/* Price */}
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl font-black" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                            {fmt(product.price)}
                        </span>
                        {product.oldPrice && (
                            <>
                                <span className="text-sm line-through" style={{ color: "rgba(100,120,170,0.60)" }}>
                                    {fmt(product.oldPrice)}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black"
                                    style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.30)" }}>
                                    -{discount}%
                                </span>
                            </>
                        )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className="w-3.5 h-3.5"
                                    style={{ color: i < Math.floor(product.rating) ? "#F59E0B" : "rgba(80,100,150,0.40)", fill: i < Math.floor(product.rating) ? "#F59E0B" : "none" }} />
                            ))}
                        </div>
                        <span className="text-sm font-bold text-white">{product.rating}</span>
                        <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>({product.reviews} sharh)</span>
                        <span className="ml-auto text-[10px]" style={{ color: product.stock < 10 ? "rgba(239,68,68,0.80)" : "rgba(16,185,129,0.80)" }}>
                            {product.stock < 10 ? `Faqat ${product.stock} dona` : "Mavjud"}
                        </span>
                    </div>

                    {/* Seller */}
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl mb-4"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${product.sellerSeed}`} alt={product.seller} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-white">{product.seller}</p>
                                {product.verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                            </div>
                            <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>Tasdiqlangan sotuvchi</p>
                        </div>
                        <ChevronRight className="w-4 h-4" style={{ color: "rgba(43,62,232,0.50)" }} />
                    </div>

                    {/* Delivery info */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { icon: Truck,   label: "Bepul yetkazish" },
                            { icon: Shield,  label: "Kafolat bor"     },
                            { icon: Package, label: "Qaytarish 14 kun"},
                        ].map(({ icon: Icon, label }, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                <Icon className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                <p className="text-[9px] text-center font-bold leading-tight" style={{ color: "rgba(120,140,190,0.90)" }}>{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="px-5 pb-6 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                {/* Quantity */}
                <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-bold text-white">Miqdor</span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setQty(q => Math.max(1, q - 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.25)" }}
                        >
                            <Minus className="w-3.5 h-3.5 text-white" />
                        </button>
                        <span className="text-lg font-black text-white w-6 text-center">{qty}</span>
                        <button
                            onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.25)" }}
                        >
                            <Plus className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setInCart(true)}
                    className="w-full p-4 rounded-2xl text-sm font-black text-white transition-all duration-150 active:scale-95"
                    style={inCart ? {
                        background: "rgba(16,185,129,0.20)",
                        border: "1px solid rgba(16,185,129,0.40)",
                        color: "#10B981",
                    } : {
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        boxShadow: "0 4px 20px rgba(43,62,232,0.45)",
                    }}
                >
                    {inCart ? "Savatga qo'shildi" : `Savatga qo'shish — ${fmt(product.price * qty)}`}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxMarketplace — asosiy panel
// ─────────────────────────────────────────────────────────────────────────────
export function NxMarketplace() {
    const { marketOpen, setMarketOpen } = useNxPlayer();
    const [category, setCategory]   = useState("Hammasi");
    const [search,   setSearch]     = useState("");
    const [liked,    setLiked]      = useState<Set<string>>(new Set());
    const [selected, setSelected]   = useState<Product | null>(null);

    if (!marketOpen) return null;

    const filtered = PRODUCTS.filter(p =>
        (category === "Hammasi" || p.category === category) &&
        (p.name.toLowerCase().includes(search.toLowerCase()) ||
         p.seller.toLowerCase().includes(search.toLowerCase()))
    );

    const toggleLike = (id: string) => {
        setLiked(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setMarketOpen(false)}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[540px] md:max-h-[90vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "92vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {selected ? (
                    <ProductDetail product={selected} onBack={() => setSelected(null)} />
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <ShoppingBag className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white leading-tight">Nexus Market</h2>
                                    <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>{PRODUCTS.length} mahsulot</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMarketOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full"
                                style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-5 pb-3 flex-shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                                    style={{ color: "rgba(43,62,232,0.50)" }} />
                                <input
                                    type="text"
                                    placeholder="Mahsulot yoki do'kon qidirish..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full h-10 rounded-xl pl-9 pr-4 text-sm text-white outline-none"
                                    style={{
                                        background: "rgba(5,8,24,0.60)",
                                        border: "1px solid rgba(43,62,232,0.22)",
                                        caretColor: "#00CEC8",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="px-5 pb-3 flex-shrink-0">
                            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategory(cat)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200"
                                        style={category === cat ? {
                                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                            color: "white",
                                        } : {
                                            background: "rgba(43,62,232,0.10)",
                                            border: "1px solid rgba(43,62,232,0.22)",
                                            color: "rgba(140,160,210,0.85)",
                                        }}
                                    >{cat}</button>
                                ))}
                            </div>
                        </div>

                        {/* Products grid */}
                        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                            {/* Trendda row */}
                            {category === "Hammasi" && search === "" && (
                                <>
                                    <p className="text-[9px] font-black uppercase tracking-widest mb-3"
                                        style={{ color: "rgba(43,62,232,0.55)" }}>Trendda</p>
                                    <div className="flex gap-3 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: "none" }}>
                                        {PRODUCTS.filter(p => p.tag === "Trendda").map(p => (
                                            <button key={p.id} onClick={() => setSelected(p)}
                                                className="flex-shrink-0 w-44 text-left group">
                                                <div className="relative aspect-square rounded-2xl overflow-hidden mb-2"
                                                    style={{ border: "1px solid rgba(43,62,232,0.20)" }}>
                                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    <button
                                                        onClick={e => { e.stopPropagation(); toggleLike(p.id); }}
                                                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full"
                                                        style={{ background: "rgba(5,8,24,0.70)" }}
                                                    >
                                                        <Heart className="w-3.5 h-3.5" style={{ color: liked.has(p.id) ? "#EF4444" : "rgba(160,180,220,0.70)", fill: liked.has(p.id) ? "#EF4444" : "none" }} />
                                                    </button>
                                                    {p.tag && (
                                                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[8px] font-black"
                                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                            {p.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-white truncate mb-0.5 group-hover:text-[#00CEC8] transition-colors duration-150">{p.name}</p>
                                                <p className="text-sm font-black" style={{ color: "#00CEC8" }}>{fmt(p.price)}</p>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Main grid */}
                            <p className="text-[9px] font-black uppercase tracking-widest mb-3"
                                style={{ color: "rgba(43,62,232,0.55)" }}>
                                {category === "Hammasi" && search === "" ? "Barcha mahsulotlar" : `${filtered.length} natija`}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {filtered.map(p => {
                                    const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
                                    return (
                                        <button key={p.id} onClick={() => setSelected(p)} className="text-left group">
                                            <div className="relative aspect-square rounded-2xl overflow-hidden mb-2"
                                                style={{ border: "1px solid rgba(43,62,232,0.18)" }}>
                                                <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                <button
                                                    onClick={e => { e.stopPropagation(); toggleLike(p.id); }}
                                                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full"
                                                    style={{ background: "rgba(5,8,24,0.70)" }}
                                                >
                                                    <Heart className="w-3.5 h-3.5" style={{ color: liked.has(p.id) ? "#EF4444" : "rgba(160,180,220,0.70)", fill: liked.has(p.id) ? "#EF4444" : "none" }} />
                                                </button>
                                                {disc > 0 && (
                                                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-lg text-[8px] font-black"
                                                        style={{ background: "rgba(16,185,129,0.90)" }}>
                                                        -{disc}%
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-white line-clamp-2 leading-snug mb-1 group-hover:text-[#00CEC8] transition-colors duration-150">{p.name}</p>
                                            <div className="flex items-center gap-1 mb-1">
                                                <Star className="w-3 h-3 fill-yellow-400" style={{ color: "#F59E0B" }} />
                                                <span className="text-[10px] font-bold text-white">{p.rating}</span>
                                                <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>({p.reviews})</span>
                                            </div>
                                            <p className="text-sm font-black" style={{ color: "#00CEC8" }}>{fmt(p.price)}</p>
                                            {p.oldPrice && (
                                                <p className="text-[10px] line-through" style={{ color: "rgba(100,120,170,0.60)" }}>{fmt(p.oldPrice)}</p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
