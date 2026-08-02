"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useRouter } from "@/i18n/routing";
import {
    Package, ChevronRight, Loader2, AlertCircle, CheckCircle2, Save, Trash2, Sparkles,
} from "lucide-react";
import { MARKET_CATEGORIES } from "@/lib/market-categories";
import { ImageUploader } from "./image-uploader";
import { MediaUploader } from "./media-uploader";
import { VariantEditor, VariantDraft } from "./variant-editor";

export function ProductEdit({ slug }: { slug: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [price, setPrice] = useState("");
    const [oldPrice, setOldPrice] = useState("");
    const [stock, setStock] = useState("");
    const [cat, setCat] = useState("");
    const [sub, setSub] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<string[]>([]);
    const [hasVariants, setHasVariants] = useState(false);
    const [variantLabel, setVariantLabel] = useState("");
    const [variants, setVariants] = useState<VariantDraft[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiErr, setAiErr] = useState("");

    async function aiFill() {
        if (!name.trim() && !images.length) { setAiErr("Avval nom yoki rasm kiriting"); return; }
        setAiBusy(true); setAiErr("");
        try {
            const res = await fetch("/api/ai/listing", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, category: cat, imageUrl: images[0] ?? null, brief: desc }),
            });
            const d = await res.json();
            if (!res.ok) setAiErr(d.error || "AI xatosi"); else setDesc(d.description);
        } catch { setAiErr("Xatolik"); } finally { setAiBusy(false); }
    }

    useEffect(() => {
        fetch(`/api/market/products/${slug}`).then(r => r.ok ? r.json() : Promise.reject())
            .then(d => {
                const p = d.product;
                setName(p.name); setDesc(p.description ?? "");
                setPrice(String(p.price)); setOldPrice(p.oldPrice ? String(p.oldPrice) : "");
                setStock(String(p.stock)); setCat(p.category); setSub(p.subcategory ?? "");
                setImages(p.images ?? []); setVideos(p.videos ?? []);
                const vs = p.variants ?? [];
                if (vs.length) {
                    setHasVariants(true);
                    setVariantLabel(p.variantLabel ?? "");
                    setVariants(vs.map((v: { name: string; price: string; oldPrice: string | null; stock: number }) => ({
                        name: v.name, price: String(v.price), oldPrice: v.oldPrice ? String(v.oldPrice) : "", stock: String(v.stock),
                    })));
                }
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug]);

    const currentCat = MARKET_CATEGORIES.find(c => c.slug === cat);

    async function save(e: React.FormEvent) {
        e.preventDefault(); setError("");
        if (!name.trim()) { setError("Nom kerak"); return; }
        if (hasVariants) {
            const valid = variants.filter(v => v.name.trim() && Number(v.price) >= 1);
            if (!valid.length) { setError("Kamida bitta to'liq variant kiriting (nom + narx)"); return; }
        } else if (!price || Number(price) < 1) { setError("Narx kerak"); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/market/products/${slug}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name, description: desc, price, oldPrice: oldPrice || null, stock,
                    category: cat, subcategory: sub || null, images, videos,
                    variantLabel: hasVariants ? variantLabel : null,
                    variants: hasVariants
                        ? variants.filter(v => v.name.trim()).map(v => ({
                            name: v.name, price: Number(v.price) || 0,
                            oldPrice: v.oldPrice ? Number(v.oldPrice) : null, stock: Number(v.stock) || 0,
                        }))
                        : [],
                }),
            });
            const d = await res.json();
            if (!res.ok) setError(d.error);
            else { setDone(true); setTimeout(() => router.push(`/market/product/${slug}`), 1500); }
        } catch { setError("Xatolik"); } finally { setSaving(false); }
    }

    async function remove() {
        if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
        const res = await fetch(`/api/market/products/${slug}`, { method: "DELETE" });
        if (res.ok) router.push("/market/brand/manage");
    }

    if (loading) return <div className="flex justify-center py-32"><Loader2 size={28} className="animate-spin text-green-500" /></div>;
    if (notFound) return <div className="text-center py-32 text-gray-400">Mahsulot topilmadi</div>;
    if (done) return (
        <div className="container mx-auto px-4 max-w-xl py-20 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Saqlandi!</h2>
            </motion.div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 max-w-2xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <Link href={`/market/product/${slug}`} className="hover:text-green-600 transition-colors truncate max-w-40">{name}</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">Tahrirlash</span>
            </nav>

            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                        <Package size={22} className="text-green-500" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Mahsulotni tahrirlash</h1>
                </div>
                <button onClick={remove}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10
                        text-red-500 font-semibold text-xs hover:bg-red-100 dark:hover:bg-red-500/20 transition">
                    <Trash2 size={13} /> O'chirish
                </button>
            </div>

            <form onSubmit={save} className="space-y-5">
                <ImageUploader kind="product" images={images} onChange={setImages} max={5} label="Mahsulot rasmlari" />

                <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Video (ixtiyoriy, maks 2)</label>
                    <MediaUploader kind="product" accept="video" media={videos} onChange={setVideos} max={2} />
                </div>

                <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Nomi *</label>
                    <input value={name} onChange={e => setName(e.target.value)} maxLength={100}
                        className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                            focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3
                            text-gray-900 dark:text-white font-semibold outline-none transition" />
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
                            <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Narx (so'm) *</label>
                            <input type="number" min={1} value={price} onChange={e => setPrice(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                    focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Eski narx</label>
                            <input type="number" min={0} value={oldPrice} onChange={e => setOldPrice(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                    focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3 text-gray-900 dark:text-white outline-none transition" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5 block">Zaxira</label>
                            <input type="number" min={0} value={stock} onChange={e => setStock(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                    focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3 text-gray-900 dark:text-white outline-none transition" />
                        </div>
                    </div>
                )}

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

                {currentCat && (
                    <div className="flex flex-wrap gap-2">
                        {currentCat.subcategories.map(s => (
                            <button key={s.slug} type="button" onClick={() => setSub(s.slug)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${sub === s.slug ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/[0.08]"}`}>
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}

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
                        className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                            focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition resize-none" />
                    {aiErr && <p className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5 mt-1"><AlertCircle size={12} />{aiErr}</p>}
                </div>

                {error && <p className="text-red-500 text-sm flex items-center gap-1.5"><AlertCircle size={14} />{error}</p>}

                <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold
                        shadow-lg shadow-green-500/25 disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
                </motion.button>
            </form>
        </div>
    );
}
