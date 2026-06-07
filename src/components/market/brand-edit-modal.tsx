"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { MARKET_CATEGORIES } from "@/lib/market-categories";
import { ImageUploader } from "./image-uploader";

interface BrandLite {
    slug: string; name: string; description: string | null;
    logo: string | null; category: string | null; categories?: string[];
}

export function BrandEditModal({ brand, onClose, onSaved }: {
    brand: BrandLite; onClose: () => void; onSaved: () => void;
}) {
    const [name, setName] = useState(brand.name);
    const [desc, setDesc] = useState(brand.description ?? "");
    const [cats, setCats] = useState<string[]>(brand.categories?.length ? brand.categories : (brand.category ? [brand.category] : []));
    const [logo, setLogo] = useState<string[]>(brand.logo ? [brand.logo] : []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    function toggleCat(s: string) {
        setCats(p => p.includes(s) ? p.filter(c => c !== s) : [...p, s]);
    }

    async function save(e: React.FormEvent) {
        e.preventDefault(); setError("");
        if (!name.trim()) { setError("Nom kerak"); return; }
        if (!cats.length) { setError("Kamida bitta yo'nalish"); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/market/brands/${brand.slug}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description: desc, categories: cats, logo: logo[0] ?? null }),
            });
            const d = await res.json();
            if (!res.ok) setError(d.error);
            else { setDone(true); setTimeout(() => { onSaved(); onClose(); }, 1200); }
        } catch { setError("Xatolik"); } finally { setSaving(false); }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.35)" }} onClick={onClose}>
            <motion.div onClick={e => e.stopPropagation()}
                initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-white/90 dark:bg-[#050F07]/95 backdrop-blur-2xl
                    border border-green-100 dark:border-green-900/30 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {done ? (
                        <div className="flex flex-col items-center py-8 gap-3">
                            <CheckCircle2 size={40} className="text-green-500" />
                            <p className="font-bold text-xl text-gray-900 dark:text-white">Saqlandi!</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-xl text-gray-900 dark:text-white">Brendni tahrirlash</h3>
                                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                    <X size={14} className="text-gray-500 dark:text-white/40" />
                                </button>
                            </div>
                            <form onSubmit={save} className="space-y-3">
                                <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Brend nomi"
                                    className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-semibold outline-none transition" />

                                <ImageUploader kind="brand" images={logo} onChange={setLogo} max={1} label="Logo" />

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-1 block">Yo'nalishlar (bir nechta)</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                        {MARKET_CATEGORIES.map(c => {
                                            const Icon = c.icon; const on = cats.includes(c.slug);
                                            return (
                                                <button key={c.slug} type="button" onClick={() => toggleCat(c.slug)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all
                                                        ${on ? "border-green-400/60 bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400" : "border-gray-200 dark:border-white/[0.07] text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04]"}`}>
                                                    <Icon size={13} style={{ color: c.color }} />{c.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} maxLength={200} placeholder="Tavsif (ixtiyoriy)"
                                    className="w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-green-400 dark:focus:border-green-500/50 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition resize-none" />

                                {error && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertCircle size={12} />{error}</p>}

                                <button type="submit" disabled={saving}
                                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm
                                        disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
