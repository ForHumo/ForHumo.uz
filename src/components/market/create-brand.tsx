"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    BadgeCheck, ChevronRight, Loader2, AlertCircle,
    CheckCircle2, Store, ArrowRight,
} from "lucide-react";
import { VerifiedBadge } from "./verified-badge";

export function CreateBrand() {
    const locale = useLocale();
    const router = useRouter();
    const [name, setName]         = useState("");
    const [slug, setSlug]         = useState("");
    const [desc, setDesc]         = useState("");
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState("");
    const [done, setDone]         = useState(false);

    function handleNameChange(v: string) {
        setName(v);
        setSlug(v.toLowerCase().trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 40));
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setError("");
        if (!name.trim()) { setError("Brend nomi kerak"); return; }
        if (!slug.trim()) { setError("Slug kerak"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/market/brands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), slug, description: desc.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); }
            else { setDone(true); setTimeout(() => router.push("/market"), 2500); }
        } catch { setError("Xatolik yuz berdi"); } finally { setLoading(false); }
    }

    return (
        <div className="container mx-auto px-4 max-w-xl py-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
                <Link href={`/market`} className="hover:text-green-600 transition-colors">Market</Link>
                <ChevronRight size={11} />
                <span className="text-gray-600 dark:text-white/50">Brend yaratish</span>
            </nav>

            {done ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-center py-12">
                    <div className="relative w-20 h-20 mx-auto mb-5">
                        <motion.div className="absolute inset-0 rounded-full bg-green-400/25"
                            animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }} />
                        <div className="relative w-full h-full rounded-full bg-green-500/15 flex items-center justify-center">
                            <CheckCircle2 size={36} className="text-green-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Brend yaratildi!</h2>
                    <p className="text-gray-500 dark:text-white/40 text-sm">Marketga yo'naltirilmoqda...</p>
                </motion.div>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                            <Store size={22} className="text-green-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white">O'z brendingizni oching</h1>
                            <p className="text-gray-400 dark:text-white/30 text-sm">Mahsulotlaringizni soting</p>
                        </div>
                    </div>

                    {/* Info card */}
                    <div className="bg-green-50/80 dark:bg-green-900/10 border border-green-200/60 dark:border-green-700/20
                        rounded-2xl p-4 mb-8">
                        <div className="flex items-start gap-3">
                            <VerifiedBadge size={18} />
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white/70">Tasdiqlangan brend</p>
                                <p className="text-xs text-gray-500 dark:text-white/35 mt-0.5 leading-relaxed">
                                    Brendingiz moderatsiyadan o'tsa, rasmiy yashil belgi qo'yiladi.
                                    Bu mijozlar ishonchini oshiradi va ko'proq sotuv keltiradi.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        {/* Brend nomi */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5">
                                Brend nomi *
                            </label>
                            <input value={name} onChange={e => handleNameChange(e.target.value)} maxLength={60}
                                placeholder="Masalan: Saber UZ, Fresh Farm..."
                                className="w-full bg-gray-50/80 dark:bg-white/[0.05]
                                    border border-gray-200 dark:border-white/[0.08]
                                    focus:border-green-400 dark:focus:border-green-500/50
                                    rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-semibold
                                    placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition" />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5">
                                URL manzil (slug) *
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 text-sm select-none">
                                    /brand/
                                </span>
                                <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    maxLength={40} placeholder="brend-nomi"
                                    className="w-full bg-gray-50/80 dark:bg-white/[0.05]
                                        border border-gray-200 dark:border-white/[0.08]
                                        focus:border-green-400 dark:focus:border-green-500/50
                                        rounded-2xl pl-20 pr-4 py-3 text-gray-900 dark:text-white font-mono text-sm
                                        placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition" />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-white/25 mt-1">
                                forhumo.uz/{locale}/market/brand/{slug || "brend-nomi"}
                            </p>
                        </div>

                        {/* Tavsif */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5">
                                Tavsif (ixtiyoriy)
                            </label>
                            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={300}
                                placeholder="Brendingiz haqida qisqacha..."
                                className="w-full bg-gray-50/80 dark:bg-white/[0.05]
                                    border border-gray-200 dark:border-white/[0.08]
                                    focus:border-green-400 dark:focus:border-green-500/50
                                    rounded-2xl px-4 py-3 text-gray-900 dark:text-white text-sm
                                    placeholder:text-gray-300 dark:placeholder:text-white/15 outline-none transition resize-none" />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm flex items-center gap-1.5">
                                <AlertCircle size={13} />{error}
                            </p>
                        )}

                        <motion.button type="submit" disabled={loading}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            className="w-full py-3.5 rounded-2xl
                                bg-gradient-to-r from-green-600 to-emerald-500
                                hover:from-green-500 hover:to-emerald-400
                                text-white font-bold shadow-lg shadow-green-500/20
                                transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                            Brend yaratish
                        </motion.button>
                    </form>
                </>
            )}
        </div>
    );
}
