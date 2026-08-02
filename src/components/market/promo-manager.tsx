"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Plus, Trash2, Loader2, X, AlertCircle, Percent, Coins } from "lucide-react";
import { formatMoney } from "@/lib/money";

interface Promo {
    id: string; code: string; type: "PERCENT" | "FIXED"; value: string;
    minOrder: string; maxDiscount: string | null; usageLimit: number | null;
    usedCount: number; expiresAt: string | null; active: boolean;
}

export function PromoManager() {
    const [codes, setCodes] = useState<Promo[]>([]);
    const [isFounder, setIsFounder] = useState(false);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    // Forma
    const [code, setCode] = useState("");
    const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
    const [value, setValue] = useState("");
    const [minOrder, setMinOrder] = useState("");
    const [maxDiscount, setMaxDiscount] = useState("");
    const [usageLimit, setUsageLimit] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function load() {
        fetch("/api/market/promo").then(r => r.json())
            .then(d => { setCodes(d.codes ?? []); setIsFounder(d.isFounder ?? false); })
            .finally(() => setLoading(false));
    }
    useEffect(load, []);

    async function create(e: React.FormEvent) {
        e.preventDefault(); setError("");
        if (!code.trim()) { setError("Kod kerak"); return; }
        if (!value || Number(value) <= 0) { setError("Qiymat kerak"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/market/promo", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, type, value, minOrder: minOrder || 0, maxDiscount: maxDiscount || null, usageLimit: usageLimit || null }),
            });
            const d = await res.json();
            if (!res.ok) setError(d.error);
            else {
                setOpen(false); setCode(""); setValue(""); setMinOrder(""); setMaxDiscount(""); setUsageLimit("");
                load();
            }
        } catch { setError("Xatolik"); } finally { setSaving(false); }
    }

    async function del(id: string) {
        setCodes(prev => prev.filter(c => c.id !== id));
        await fetch("/api/market/promo", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    }

    if (loading || !isFounder) return null;

    const inputCls = "w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-green-400 dark:focus:border-green-500/50 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none transition";

    return (
        <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Tag size={20} className="text-green-500" />
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Promokodlar</h2>
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full px-2 py-0.5 font-bold">Asoschi</span>
                </div>
                <button onClick={() => setOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-500/20 transition">
                    <Plus size={14} /> Yangi
                </button>
            </div>

            {!codes.length ? (
                <div className="text-center py-8 bg-gray-50/70 dark:bg-white/[0.02] rounded-2xl text-sm text-gray-400 dark:text-white/30">
                    Hali promokod yo&apos;q
                </div>
            ) : (
                <div className="space-y-2">
                    {codes.map(c => (
                        <div key={c.id} className="flex items-center gap-3 bg-white/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-4">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                {c.type === "PERCENT" ? <Percent size={16} className="text-green-500" /> : <Coins size={16} className="text-green-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white font-mono">{c.code}</p>
                                <p className="text-xs text-gray-400 dark:text-white/30">
                                    {c.type === "PERCENT" ? `${Number(c.value)}% chegirma` : `${formatMoney(Number(c.value), "UZS")} chegirma`}
                                    {Number(c.minOrder) > 0 && ` · min ${formatMoney(Number(c.minOrder), "UZS")}`}
                                    {` · ${c.usedCount}${c.usageLimit ? `/${c.usageLimit}` : ""} marta`}
                                </p>
                            </div>
                            <button onClick={() => del(c.id)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 dark:text-white/25 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition shrink-0">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center px-4"
                        style={{ backdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.35)" }} onClick={() => setOpen(false)}>
                        <motion.div onClick={e => e.stopPropagation()}
                            initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-white/90 dark:bg-[#050F07]/95 backdrop-blur-2xl border border-green-100 dark:border-green-900/30 rounded-3xl shadow-2xl p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-xl text-gray-900 dark:text-white">Yangi promokod</h3>
                                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                    <X size={14} className="text-gray-500 dark:text-white/40" />
                                </button>
                            </div>
                            <form onSubmit={create} className="space-y-3">
                                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="KOD (masalan YANGI2026)" maxLength={24}
                                    className={`${inputCls} font-mono uppercase font-bold`} />
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setType("PERCENT")}
                                        className={`py-2.5 rounded-xl border text-sm font-semibold transition ${type === "PERCENT" ? "border-green-400/60 bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400" : "border-gray-200 dark:border-white/[0.07] text-gray-500 dark:text-white/40"}`}>
                                        Foiz (%)
                                    </button>
                                    <button type="button" onClick={() => setType("FIXED")}
                                        className={`py-2.5 rounded-xl border text-sm font-semibold transition ${type === "FIXED" ? "border-green-400/60 bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-400" : "border-gray-200 dark:border-white/[0.07] text-gray-500 dark:text-white/40"}`}>
                                        Belgilangan (so'm)
                                    </button>
                                </div>
                                <input value={value} onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal"
                                    placeholder={type === "PERCENT" ? "Foiz (masalan 10)" : "Miqdor so'm (masalan 5000)"} className={inputCls} />
                                <div className="grid grid-cols-3 gap-2">
                                    <input value={minOrder} onChange={e => setMinOrder(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Min buyurtma" className={inputCls} />
                                    {type === "PERCENT" && <input value={maxDiscount} onChange={e => setMaxDiscount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Maks chegirma" className={inputCls} />}
                                    <input value={usageLimit} onChange={e => setUsageLimit(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="Limit" className={inputCls} />
                                </div>
                                {error && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertCircle size={12} />{error}</p>}
                                <button type="submit" disabled={saving}
                                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Yaratish
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
