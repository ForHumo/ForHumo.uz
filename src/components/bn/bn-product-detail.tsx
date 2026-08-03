"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { BnHeader } from "./bn-header";
import { Phone, MapPin, Truck, Loader2, Package, ChevronLeft, ChevronRight, ExternalLink, Store, Eye, Calendar } from "lucide-react";

interface Seller {
    id: string; shopName: string; shopSlug: string; city: string; phone: string;
    logoUrl: string | null; address: string | null; description: string | null;
}
interface Category { id: string; slug: string; name: string }
interface Product {
    id: string; slug: string; title: string; description: string | null;
    price: number; oldPrice: number | null; images: string[]; videos: string[];
    stock: number; sold: number; views: number;
    carBrand: string | null; carModel: string | null; carYearFrom: number | null; carYearTo: number | null;
    partCondition: string; hasDelivery: boolean; pickupOnly: boolean; createdAt: string;
    seller: Seller; category: Category | null;
}
interface Related { id: string; slug: string; title: string; price: number; images: string[] }

function fmtSom(n: number): string {
    return `${n.toLocaleString("uz-UZ")} so'm`;
}
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" });
}

export function BnProductDetail({ slug }: { slug: string }) {
    const [data, setData] = useState<{ product: Product; related: Related[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [imgIdx, setImgIdx] = useState(0);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/bn/products/${slug}`)
            .then(r => r.json())
            .then(d => { if (d.product) setData(d); })
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EAB308" }} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#fafafa" }}>
                <BnHeader />
                <div className="text-center py-24 px-6">
                    <p className="text-lg font-bold mb-2">Mahsulot topilmadi</p>
                    <Link href="/bn" className="inline-block px-5 py-2.5 rounded-xl text-sm font-black text-black" style={{ background: "#EAB308" }}>
                        Katalogga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    const p = data.product;
    const images = p.images.length > 0 ? p.images : [null];
    const hasDiscount = p.oldPrice && p.oldPrice > p.price;
    const discountPct = hasDiscount ? Math.round(((p.oldPrice! - p.price) / p.oldPrice!) * 100) : 0;
    const yearRange = p.carYearFrom && p.carYearTo ? `${p.carYearFrom}-${p.carYearTo}` : p.carYearFrom ? `${p.carYearFrom}+` : null;

    return (
        <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#fafafa" }}>
            <BnHeader />

            <div className="max-w-5xl mx-auto px-4 py-6 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rasm galereya */}
                    <div>
                        <div className="relative aspect-square rounded-2xl overflow-hidden" style={{ background: "#000" }}>
                            {images[imgIdx] ? (
                                <img src={images[imgIdx]!} alt={p.title} className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-16 h-16" style={{ color: "rgba(255,255,255,0.20)" }} />
                                </div>
                            )}
                            {images.length > 1 && (
                                <>
                                    <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} disabled={imgIdx === 0}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full disabled:opacity-30"
                                        style={{ background: "rgba(0,0,0,0.6)" }}>
                                        <ChevronLeft className="w-4 h-4 text-white" />
                                    </button>
                                    <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))} disabled={imgIdx === images.length - 1}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full disabled:opacity-30"
                                        style={{ background: "rgba(0,0,0,0.6)" }}>
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </button>
                                </>
                            )}
                            {p.partCondition === "used" && (
                                <span className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-black"
                                    style={{ background: "rgba(0,0,0,0.75)", color: "#fff" }}>ISHLATILGAN</span>
                            )}
                            {hasDiscount && (
                                <span className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-black"
                                    style={{ background: "#EF4444", color: "#fff" }}>-{discountPct}%</span>
                            )}
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-1.5 mt-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                                {images.map((u, i) => (
                                    <button key={i} onClick={() => setImgIdx(i)}
                                        className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden"
                                        style={{ border: i === imgIdx ? "2px solid #EAB308" : "1px solid rgba(255,255,255,0.15)", background: "#000" }}>
                                        {u && <img src={u} alt="" className="w-full h-full object-cover" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div>
                        <h1 className="text-2xl font-black text-white mb-2 leading-tight">{p.title}</h1>

                        {(p.carBrand || p.carModel || yearRange) && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {p.carBrand && <span className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: "rgba(234,179,8,0.10)", color: "#EAB308" }}>{p.carBrand}</span>}
                                {p.carModel && <span className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: "rgba(234,179,8,0.10)", color: "#EAB308" }}>{p.carModel}</span>}
                                {yearRange && <span className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(200,200,200,0.85)" }}>{yearRange}</span>}
                            </div>
                        )}

                        <div className="flex items-baseline gap-3 mb-4">
                            <span className="text-3xl font-black" style={{ color: "#EAB308" }}>{fmtSom(p.price)}</span>
                            {hasDiscount && <span className="text-sm line-through" style={{ color: "rgba(200,200,200,0.55)" }}>{fmtSom(p.oldPrice!)}</span>}
                        </div>

                        {/* Stock/status */}
                        <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: "rgba(200,200,200,0.75)" }}>
                            <span className={p.stock > 0 ? "text-green-400" : "text-red-400"}>
                                {p.stock > 0 ? `${p.stock} dona bor` : "Tugagan"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(p.createdAt)}</span>
                        </div>

                        {/* Delivery */}
                        <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            {p.hasDelivery ? (
                                <div className="flex items-center gap-2 text-sm">
                                    <Truck className="w-4 h-4" style={{ color: "#10B981" }} />
                                    <span>Yandex/BTS orqali yetkazib beriladi</span>
                                </div>
                            ) : p.pickupOnly ? (
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-4 h-4" style={{ color: "#EAB308" }} />
                                    <span>Faqat do&apos;kondan olib ketish</span>
                                </div>
                            ) : (
                                <div className="text-sm" style={{ color: "rgba(200,200,200,0.65)" }}>Yetkazish sotuvchi bilan kelishiladi</div>
                            )}
                        </div>

                        {/* Contact seller */}
                        <a href={`tel:${p.seller.phone}`}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-black mb-3"
                            style={{ background: "#EAB308" }}>
                            <Phone className="w-4 h-4" /> {p.seller.phone}
                        </a>

                        {/* Seller info */}
                        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: "#0a0a0a", border: "1px solid rgba(234,179,8,0.30)" }}>
                                    {p.seller.logoUrl ? <img src={p.seller.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : <Store className="w-4 h-4" style={{ color: "#EAB308" }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{p.seller.shopName}</p>
                                    <p className="text-[11px] flex items-center gap-1" style={{ color: "rgba(200,200,200,0.65)" }}>
                                        <MapPin className="w-2.5 h-2.5" /> {p.seller.city}
                                    </p>
                                </div>
                            </div>
                            {p.seller.address && (
                                <p className="text-[11px] mt-2" style={{ color: "rgba(200,200,200,0.65)" }}>{p.seller.address}</p>
                            )}
                        </div>

                        {/* Description */}
                        {p.description && (
                            <div className="mt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(200,200,200,0.75)" }}>Tavsif</p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(230,230,230,0.90)" }}>{p.description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related (shu sotuvchining boshqa mahsulotlari) */}
                {data.related.length > 0 && (
                    <div className="mt-10">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-black text-white flex items-center gap-2">
                                <Store className="w-4 h-4" style={{ color: "#EAB308" }} />
                                Shu do&apos;kondan boshqa mahsulotlar
                            </p>
                            <Link href={`/bn?sellerId=${p.seller.id}`} className="text-xs flex items-center gap-1" style={{ color: "#EAB308" }}>
                                Barchasi <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {data.related.map(r => (
                                <Link key={r.id} href={`/bn/product/${r.slug}`}
                                    className="rounded-lg overflow-hidden"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <div className="aspect-square" style={{ background: "#000" }}>
                                        {r.images[0] ? <img src={r.images[0]} alt="" className="w-full h-full object-cover" /> : (
                                            <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6" style={{ color: "rgba(255,255,255,0.20)" }} /></div>
                                        )}
                                    </div>
                                    <div className="p-1.5">
                                        <p className="text-[10px] font-bold text-white line-clamp-2">{r.title}</p>
                                        <p className="text-[11px] font-black mt-0.5" style={{ color: "#EAB308" }}>{fmtSom(r.price)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
