"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";
import {
    Store, Plus, ChevronRight, BadgeCheck, Package,
    Loader2, CheckCircle2, AlertCircle, X, ArrowRight,
} from "lucide-react";
import { VerifiedBadge } from "./verified-badge";
import { MARKET_CATEGORIES } from "@/lib/market-categories";
import { ImageUploader } from "./image-uploader";

interface Brand {
    id: string; slug: string; name: string; description: string | null;
    category: string | null; verified: boolean; isPaid: boolean; createdAt: string;
    _count: { products: number };
}

// ─── Yangi brend formi ────────────────────────────────────────────────────────
function CreateBrandForm({ onCreated, nextPrice }: { onCreated: (b: Brand) => void; nextPrice: number }) {
    const [open, setOpen]   = useState(false);
    const [name, setName]   = useState("");
    const [slug, setSlug]   = useState("");
    const [desc, setDesc]   = useState("");
    const [cat, setCat]     = useState("");
    const [logo, setLogo]   = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone]   = useState(false);

    function handleName(v: string) {
        setName(v);
        setSlug(v.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40));
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError("");
        if (!name.trim()) { setError("Nom kerak"); return; }
        if (!slug.trim()) { setError("Slug kerak"); return; }
        if (!cat) { setError("Yo'nalish tanlang"); return; }
        if (!logo.length) { setError("Brend logosini yuklang"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/market/brands", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, slug, description: desc, category: cat, logo: logo[0] }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); }
            else { setDone(true); onCreated(data.brand); setTimeout(() => { setOpen(false); setDone(false); setName(""); setSlug(""); setDesc(""); setCat(""); setLogo([]); }, 1800); }
        } catch { setError("Xatolik"); } finally { setLoading(false); }
    }

    return (
        <>
            <motion.button onClick={() => setOpen(true)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl
                    bg-gradient-to-r from-green-600 to-emerald-500
                    text-white font-bold text-sm shadow-lg shadow-green-500/20
                    hover:from-green-500 hover:to-emerald-400 transition-all">
                <Plus size={16} /> Yangi brend
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center px-4"
                        style={{ backdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.3)" }}
                        onClick={() => setOpen(false)}>
                        <motion.div onClick={e => e.stopPropagation()}
                            initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-white/90 dark:bg-[#050F07]/95
                                backdrop-blur-2xl border border-green-100 dark:border-green-900/30
                                rounded-3xl shadow-2xl overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />
                            <div className="p-6">
                                {done ? (
                                    <div className="flex flex-col items-center py-8 gap-3">
                                        <div className="relative w-16 h-16">
                                            <motion.div className="absolute inset-0 rounded-full bg-green-400/30"
                                                animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
                                            <div className="relative w-full h-full rounded-full bg-green-500/20 flex items-center justify-center">
                                                <CheckCircle2 size={30} className="text-green-500" />
                                            </div>
                                        </div>
                                        <p className="font-bold text-xl text-gray-900 dark:text-white">Brend yaratildi!</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-5">
                                            <div>
                                                <h3 className="font-bold text-xl text-gray-900 dark:text-white">Yangi brend</h3>
                                                <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">O'z do'koningizni oching</p>
                                            </div>
                                            <button onClick={() => setOpen(false)}
                                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                                <X size={14} className="text-gray-500 dark:text-white/40" />
                                            </button>
                                        </div>
                                        <form onSubmit={submit} className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1 block">Brend nomi *</label>
                                                <input value={name} onChange={e => handleName(e.target.value)} maxLength={60}
                                                    placeholder="Masalan: Saber UZ, Fresh Farm..."
                                                    className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                                        focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3
                                                        text-gray-900 dark:text-white font-semibold placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition" />
                                            </div>

                                            {/* Logo — qurilmadan */}
                                            <ImageUploader kind="brand" images={logo} onChange={setLogo} max={1}
                                                label="Brend logosi * (qurilmangizdan yuklang)" />

                                            {/* Yo'nalish */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1 block">Yo'nalish *</label>
                                                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                                                    {MARKET_CATEGORIES.map(c => {
                                                        const Icon = c.icon;
                                                        return (
                                                            <button key={c.slug} type="button" onClick={() => setCat(c.slug)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all
                                                                    ${cat === c.slug
                                                                        ? "border-green-400/60 bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400"
                                                                        : "border-gray-200 dark:border-white/[0.07] text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04]"}`}>
                                                                <Icon size={13} style={{ color: c.color }} />
                                                                {c.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1 block">URL slug *</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 text-xs">/brand/</span>
                                                    <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                                        maxLength={40}
                                                        className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                                            focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl pl-14 pr-4 py-3
                                                            text-gray-900 dark:text-white font-mono text-sm outline-none transition" />
                                                </div>
                                            </div>

                                            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} maxLength={200}
                                                placeholder="Brend haqida qisqacha (ixtiyoriy)"
                                                className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                                                    focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3
                                                    text-gray-900 dark:text-white text-sm placeholder:text-gray-300 dark:placeholder:text-white/15
                                                    outline-none transition resize-none" />

                                            {/* Narx banner */}
                                            <div className={`rounded-xl px-3 py-2 text-xs font-semibold text-center
                                                ${nextPrice === 0
                                                    ? "bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400"
                                                    : "bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400"}`}>
                                                {nextPrice === 0
                                                    ? "Bu brend BEPUL"
                                                    : `Bu brendni ochish narxi: ${nextPrice} Ƶ (hamyondan yechiladi)`}
                                            </div>

                                            {error && (
                                                <p className="text-red-500 text-xs flex items-center gap-1.5">
                                                    <AlertCircle size={12} />{error}
                                                </p>
                                            )}

                                            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500
                                                    text-white font-bold text-sm shadow-lg shadow-green-500/25 disabled:opacity-40
                                                    flex items-center justify-center gap-2 transition-all">
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />}
                                                {nextPrice === 0 ? "Brend yaratish (bepul)" : `${nextPrice} Ƶ to'lab yaratish`}
                                            </motion.button>
                                        </form>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ─── Asosiy sahifa ─────────────────────────────────────────────────────────
export function BrandManage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [nextPrice, setNextPrice] = useState(0);
    const [isFounder, setIsFounder] = useState(false);
    const [loading, setLoading] = useState(true);

    function reload() {
        fetch("/api/market/brands").then(r => r.json())
            .then(d => { setBrands(d.brands ?? []); setNextPrice(d.nextPrice ?? 0); setIsFounder(d.isFounder ?? false); })
            .finally(() => setLoading(false));
    }
    useEffect(reload, []);

    return (
        <div className="container mx-auto px-4 max-w-4xl py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                <Link href="/market" className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">Mening brendlarim</span>
            </nav>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Store size={22} className="text-green-500" />
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Mening brendlarim</h1>
                </div>
                <CreateBrandForm nextPrice={nextPrice} onCreated={() => reload()} />
            </div>

            {/* Ma'lumot: birinchi bepul */}
            <div className="bg-green-50/80 dark:bg-green-900/10 border border-green-200/60 dark:border-green-800/20
                rounded-2xl p-4 mb-6 flex items-start gap-3">
                <BadgeCheck size={16} className="text-green-500 mt-0.5 shrink-0" />
                <div className="text-xs text-gray-600 dark:text-white/50 leading-relaxed">
                    {isFounder ? (
                        <><span className="font-bold text-green-700 dark:text-green-400">Asoschi hisobi.</span>
                        {" "}Barcha brendlaringiz bepul va avtomatik tasdiqlangan.</>
                    ) : (
                        <><span className="font-bold text-green-700 dark:text-green-400">1-brend bepul.</span>
                        {" "}Keyingilari: 2-chi 25 Ƶ · 3-chi 50 Ƶ · 4-chi 100 Ƶ · 5+ 200 Ƶ (hamyondan yechiladi).</>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-green-500" /></div>
            ) : !brands.length ? (
                <div className="text-center py-20">
                    <Store size={48} className="text-gray-200 dark:text-white/10 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-white/40 font-semibold mb-2">Hali brend yo'q</p>
                    <p className="text-gray-400 dark:text-white/25 text-sm">Yuqoridagi tugmani bosib birinchi brendingizni oching</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {brands.map((brand, i) => (
                        <motion.div key={brand.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]
                                hover:border-green-200 dark:hover:border-green-800/30 rounded-2xl p-5 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                                        <Store size={20} className="text-green-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900 dark:text-white">{brand.name}</p>
                                            {brand.verified && <VerifiedBadge size={14} />}
                                            {brand.isPaid && (
                                                <span className="text-[10px] bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full px-2 py-0.5 font-bold">
                                                    Premium
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                                            /brand/{brand.slug} · {brand.category ?? "—"} · {brand._count.products} ta mahsulot
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link href={`/market/product/add?brand=${brand.slug}`}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                                            bg-green-500/10 hover:bg-green-500/20
                                            text-green-600 dark:text-green-400 font-semibold text-xs transition-all">
                                        <Plus size={13} />Mahsulot qo'shish
                                    </Link>
                                    <Link href={`/market/brand/${brand.slug}`}
                                        className="flex items-center gap-1 px-3 py-2 rounded-xl
                                            border border-gray-200 dark:border-white/[0.07] hover:border-green-300
                                            text-gray-500 dark:text-white/30 text-xs transition-all">
                                        <Package size={12} />Ko'rish
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
