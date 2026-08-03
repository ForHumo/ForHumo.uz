"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { BnHeader } from "./bn-header";
import { Search, Package, Store, ChevronRight, MapPin, Loader2, Truck } from "lucide-react";

interface Product {
    id: string; slug: string; title: string; price: number; oldPrice: number | null;
    images: string[]; carBrand: string | null; carModel: string | null;
    partCondition: string; hasDelivery: boolean;
    seller: { id: string; shopName: string; shopSlug: string; city: string };
}

function fmtSom(n: number): string {
    return `${n.toLocaleString("uz-UZ")} so'm`;
}

// Popular car brands (Uzbekistan)
const POPULAR_BRANDS = [
    "Chevrolet", "Daewoo", "Kia", "Hyundai", "Toyota", "Nissan", "Lada", "GAZ",
];

export function BnHome() {
    const [products, setProducts] = useState<Product[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [brand, setBrand] = useState<string | null>(null);
    const [count, setCount] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (brand) params.set("brand", brand);
        params.set("limit", "48");
        try {
            const d = await fetch(`/api/bn/products?${params}`).then(r => r.json());
            setProducts(d.products ?? []);
            setCount(d.products?.length ?? 0);
        } finally { setLoading(false); }
    }, [q, brand]);

    useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

    // Bo'sh (hech qanday mahsulot yo'q, brand ham tanlamagan, qidiruv ham yo'q)
    const isEmptyState = !loading && (!products || products.length === 0) && !q && !brand;

    return (
        <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#fafafa" }}>
            <BnHeader active="home" />

            {isEmptyState ? (
                /* Hech kim hali mahsulot qo'shmagan — coming soon */
                <div className="max-w-2xl mx-auto px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-2xl inline-flex items-center justify-center mb-6"
                        style={{ background: "#0a0a0a", border: "2px solid #EAB308", boxShadow: "0 0 40px rgba(234,179,8,0.25)" }}>
                        <span className="text-2xl font-black" style={{ color: "#EAB308", fontFamily: "serif" }}>BN</span>
                    </div>
                    <h1 className="text-3xl font-black mb-2">Bozor Narxida</h1>
                    <p className="text-base mb-8" style={{ color: "rgba(200,200,200,0.75)" }}>
                        Sergeli mashina bozori onlayn — tez orada birinchi mahsulotlar
                    </p>
                    <Link href="/bn/seller/register"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-black"
                        style={{ background: "#EAB308" }}>
                        <Store className="w-4 h-4" /> Sotuvchi bo&apos;lish
                    </Link>
                    <p className="text-[11px] mt-4" style={{ color: "rgba(200,200,200,0.55)" }}>
                        For Humo tomonidan qo&apos;llab-quvvatlanadi
                    </p>
                </div>
            ) : (
                <>
                    {/* Hero + search */}
                    <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(200,200,200,0.55)" }} />
                            <input value={q} onChange={e => setQ(e.target.value)}
                                placeholder="Ehtiyot qism, marka yoki model qidirish..."
                                className="w-full h-12 rounded-xl pl-11 pr-4 text-sm text-white outline-none"
                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }} />
                        </div>

                        {/* Marka chip'lar */}
                        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                            <button onClick={() => setBrand(null)}
                                className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
                                style={brand === null
                                    ? { background: "#EAB308", color: "#000" }
                                    : { background: "rgba(255,255,255,0.05)", color: "rgba(200,200,200,0.75)" }}>
                                Barchasi
                            </button>
                            {POPULAR_BRANDS.map(b => (
                                <button key={b} onClick={() => setBrand(brand === b ? null : b)}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
                                    style={brand === b
                                        ? { background: "#EAB308", color: "#000" }
                                        : { background: "rgba(255,255,255,0.05)", color: "rgba(200,200,200,0.75)" }}>
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products grid */}
                    <div className="max-w-6xl mx-auto px-4 pb-16">
                        {loading ? (
                            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EAB308" }} /></div>
                        ) : (products?.length ?? 0) === 0 ? (
                            <div className="text-center py-16">
                                <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.20)" }} />
                                <p className="text-sm font-bold mb-1">Topilmadi</p>
                                <p className="text-xs" style={{ color: "rgba(200,200,200,0.65)" }}>Boshqa filter yoki qidiruvni sinab ko&apos;ring</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-[11px] mb-3" style={{ color: "rgba(200,200,200,0.55)" }}>
                                    {count} ta mahsulot
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {products?.map(p => (
                                        <Link key={p.id} href={`/bn/product/${p.slug}`}
                                            className="rounded-xl overflow-hidden group"
                                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                            <div className="aspect-square relative" style={{ background: "#000" }}>
                                                {p.images[0] ? (
                                                    <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-8 h-8" style={{ color: "rgba(255,255,255,0.20)" }} />
                                                    </div>
                                                )}
                                                {p.partCondition === "used" && (
                                                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black"
                                                        style={{ background: "rgba(0,0,0,0.75)", color: "#fff" }}>ISHLATILGAN</span>
                                                )}
                                                {p.hasDelivery && (
                                                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center"
                                                        style={{ background: "rgba(16,185,129,0.85)" }} title="Yetkazib beriladi">
                                                        <Truck className="w-3 h-3 text-white" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-2">
                                                <p className="text-xs font-bold text-white line-clamp-2 min-h-[2.5em]">{p.title}</p>
                                                <div className="flex items-baseline gap-1.5 mt-1">
                                                    <span className="text-sm font-black" style={{ color: "#EAB308" }}>{fmtSom(p.price)}</span>
                                                    {p.oldPrice && p.oldPrice > p.price && (
                                                        <span className="text-[10px] line-through" style={{ color: "rgba(200,200,200,0.45)" }}>{fmtSom(p.oldPrice)}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 mt-1.5 text-[9px]" style={{ color: "rgba(200,200,200,0.60)" }}>
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    <span className="truncate">{p.seller.shopName}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sotuvchi bo'lish CTA */}
                    <div className="max-w-6xl mx-auto px-4 pb-16">
                        <Link href="/bn/seller/register"
                            className="flex items-center justify-between rounded-2xl p-5"
                            style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.10), rgba(0,0,0,0.5))", border: "1px solid rgba(234,179,8,0.25)" }}>
                            <div>
                                <p className="text-sm font-black text-white">Siz ham sotuvchi bo&apos;ling</p>
                                <p className="text-xs mt-0.5" style={{ color: "rgba(200,200,200,0.75)" }}>YaTT bilan ro&apos;yxatdan o&apos;ting, mahsulot qo&apos;shing</p>
                            </div>
                            <ChevronRight className="w-5 h-5" style={{ color: "#EAB308" }} />
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
