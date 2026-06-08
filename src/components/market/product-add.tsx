"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import {
    Package, ChevronRight, Loader2, AlertCircle, CheckCircle2,
    Plus, Store, Sparkles,
} from "lucide-react";
import { MARKET_CATEGORIES } from "@/lib/market-categories";
import { ImageUploader } from "./image-uploader";
import { MediaUploader } from "./media-uploader";
import { VariantEditor, VariantDraft } from "./variant-editor";

interface Brand { id: string; slug: string; name: string; category: string | null; }

export function ProductAdd() {
    const router = useRouter();
    const params = useSearchParams();
    const presetBrand = params.get("brand") ?? "";

    const [brands, setBrands]   = useState<Brand[]>([]);
    const [brandSlug, setBrandSlug] = useState(presetBrand);
    const [name, setName]       = useState("");
    const [desc, setDesc]       = useState("");
    const [price, setPrice]     = useState("");
    const [oldPrice, setOldPrice] = useState("");
    const [stock, setStock]     = useState("");
    const [cat, setCat]         = useState("");
    const [sub, setSub]         = useState("");
    const [images, setImages]   = useState<string[]>([]);
    const [videos, setVideos]   = useState<string[]>([]);
    const [hasVariants, setHasVariants] = useState(false);
    const [variantLabel, setVariantLabel] = useState("");
    const [variants, setVariants] = useState<VariantDraft[]>([]);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiErr, setAiErr] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");
    const [done, setDone]       = useState(false);
    const [brandsLoading, setBrandsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/market/brands").then(r => r.json())
            .then(d => {
                setBrands(d.brands ?? []);
                if (!presetBrand && d.brands?.[0]) setBrandSlug(d.brands[0].slug);
            })
            .finally(() => setBrandsLoading(false));
    }, [presetBrand]);

    const currentCat = MARKET_CATEGORIES.find(c => c.slug === cat);

    async function aiFill() {
        if (!name.trim() && !images.length) { setAiErr("Avval nom yoki rasm kiriting"); return; }
        setAiBusy(true); setAiErr("");
        try {
            const res = await fetch("/api/ai/listing", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, category: cat, imageUrl: images[0] ?? null, brief: desc }),
            });
            const d = await res.json();
            if (!res.ok) setAiErr(d.error || "AI xatosi");
            else setDesc(d.description);
        } catch { setAiErr("Xatolik"); } finally { setAiBusy(false); }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError("");
        if (!brandSlug) { setError("Brend tanlang"); return; }
        if (!name.trim()) { setError("Mahsulot nomini kiriting"); return; }
        if (hasVariants) {
            const valid = variants.filter(v => v.name.trim() && Number(v.price) >= 1);
            if (!valid.length) { setError("Kamida bitta to'liq variant kiriting (nom + narx)"); return; }
        } else if (!price || Number(price) < 1) { setError("Narxni kiriting"); return; }
        if (!cat) { setError("Kategoriya tanlang"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/market/products", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    brandSlug, name, description: desc,
                    price: hasVariants ? null : price, oldPrice: oldPrice || null,
                    stock: hasVariants ? 0 : (stock || 0), category: cat, subcategory: sub || null, images, videos,
                    ...(hasVariants ? {
                        variantLabel,
                        variants: variants.filter(v => v.name.trim()).map(v => ({
                            name: v.name, price: Number(v.price) || 0,
                            oldPrice: v.oldPrice ? Number(v.oldPrice) : null, stock: Number(v.stock) || 0,
                        })),
                    } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); }
            else { setDone(true); setTimeout(() => router.push(`/market/product/${data.product.slug}`), 1800); }
        } catch { setError("Xatolik yuz berdi"); } finally { setLoading(false); }
    }

    if (done) return (
        <div className="container mx-auto px-4 max-w-xl py-20 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="relative w-20 h-20 mx-auto mb-5">
                    <motion.div className="absolute inset-0 rounded-full bg-green-400/25"
                        animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    <div className="relative w-full h-full rounded-full bg-green-500/15 flex items-center justify-center">
                        <CheckCircle2 size={36} className="text-green-500" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Mahsulot qo'shildi!</h2>
                <p className="text-gray-500 dark:text-white/40 text-sm">Mahsulot sahifasiga yo'naltirilmoqda...</p>
            </motion.div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 max-w-2xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <Link href="/market/brand/manage" className="hover:text-green-600 transition-colors">Brendlarim</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">Mahsulot qo'shish</span>
            </nav>

            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                    <Package size={22} className="text-green-500" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Yangi mahsulot</h1>
            </div>

            {brandsLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-green-500" /></div>
            ) : !brands.length ? (
                <div className="text-center py-12 bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/20 rounded-2xl">
                    <Store size={36} className="text-amber-500 mx-auto mb-3" />
                    <p className="text-gray-700 dark:text-white/60 font-semibold mb-1">Avval brend oching</p>
                    <p className="text-gray-400 dark:text-white/30 text-sm mb-4">Mahsulot qo'shish uchun kamida bitta brendingiz bo'lishi kerak</p>
                    <Link href="/market/brand/manage"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm">
                        <Plus size={15} /> Brend ochish
                    </Link>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    {/* Brend tanlash */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Brend *</label>
                        <div className="flex flex-wrap gap-2">
                            {brands.map(b => (
                                <button key={b.id} type="button" onClick={() => setBrandSlug(b.slug)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all
                                        ${brandSlug === b.slug
                                            ? "border-green-400/60 bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400"
                                            : "border-gray-200 dark:border-white/[0.07] text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04]"}`}>
                                    <Store size={13} />{b.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Nom */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Mahsulot nomi *</label>
                        <input value={name} onChange={e => setName(e.target.value)} maxLength={100}
                            placeholder="Masalan: Premium paxta ko'ylak"
                            className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3
                                text-gray-900 dark:text-white font-semibold placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition" />
                    </div>

                    {/* Variant rejimi */}
                    <div className="flex items-center justify-between bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Variantlar</p>
                            <p className="text-xs text-gray-400 dark:text-white/30">Rang/o&apos;lcham/xotira — har biriga alohida narx va stock</p>
                        </div>
                        <button type="button" onClick={() => setHasVariants(v => !v)}
                            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${hasVariants ? "bg-green-500" : "bg-gray-300 dark:bg-white/15"}`}>
                            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${hasVariants ? "translate-x-5" : ""}`} />
                        </button>
                    </div>

                    {hasVariants ? (
                        <VariantEditor label={variantLabel} onLabel={setVariantLabel} variants={variants} onChange={setVariants} />
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Narx (Ƶ) *</label>
                                <input type="number" min={1} value={price} onChange={e => setPrice(e.target.value)}
                                    placeholder="100"
                                    className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                        focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3
                                        text-gray-900 dark:text-white font-bold outline-none transition" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Eski narx</label>
                                <input type="number" min={0} value={oldPrice} onChange={e => setOldPrice(e.target.value)}
                                    placeholder="ixtiyoriy"
                                    className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                        focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3
                                        text-gray-900 dark:text-white outline-none transition" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Zaxira</label>
                                <input type="number" min={0} value={stock} onChange={e => setStock(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                        focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3
                                        text-gray-900 dark:text-white outline-none transition" />
                            </div>
                        </div>
                    )}

                    {/* Kategoriya */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Kategoriya *</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {MARKET_CATEGORIES.map(c => {
                                const Icon = c.icon;
                                return (
                                    <button key={c.slug} type="button" onClick={() => { setCat(c.slug); setSub(""); }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all
                                            ${cat === c.slug
                                                ? "border-green-400/60 bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400"
                                                : "border-gray-200 dark:border-white/[0.07] text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04]"}`}>
                                        <Icon size={13} style={{ color: c.color }} />
                                        <span className="truncate">{c.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subkategoriya */}
                    {currentCat && (
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Kichik kategoriya</label>
                            <div className="flex flex-wrap gap-2">
                                {currentCat.subcategories.map(s => (
                                    <button key={s.slug} type="button" onClick={() => setSub(s.slug)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                            ${sub === s.slug
                                                ? "bg-green-500 text-white"
                                                : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/[0.08]"}`}>
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rasmlar — qurilmadan yuklash */}
                    <ImageUploader kind="product" images={images} onChange={setImages} max={5}
                        label="Mahsulot rasmlari (qurilmangizdan yuklang)" />

                    {/* Video (ixtiyoriy) */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">
                            Mahsulot videosi (ixtiyoriy, maks 2)
                        </label>
                        <MediaUploader kind="product" accept="video" media={videos} onChange={setVideos} max={2} />
                    </div>

                    {/* Tavsif */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-gray-500 dark:text-white/40 block">Tavsif</label>
                            <button type="button" onClick={aiFill} disabled={aiBusy}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                                    bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 text-violet-600 dark:text-violet-300
                                    hover:from-violet-500/25 hover:to-fuchsia-500/25 disabled:opacity-50 transition-all">
                                {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                AI bilan yozish
                            </button>
                        </div>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={500}
                            placeholder="Mahsulot haqida... yoki 'AI bilan yozish' tugmasini bosing"
                            className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3 text-sm
                                text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition resize-none" />
                        {aiErr && <p className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5 mt-1"><AlertCircle size={12} />{aiErr}</p>}
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm flex items-center gap-1.5">
                            <AlertCircle size={14} />{error}
                        </p>
                    )}

                    <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500
                            text-white font-bold shadow-lg shadow-green-500/25 disabled:opacity-40
                            flex items-center justify-center gap-2 transition-all">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Mahsulotni joylash
                    </motion.button>
                </form>
            )}
        </div>
    );
}
