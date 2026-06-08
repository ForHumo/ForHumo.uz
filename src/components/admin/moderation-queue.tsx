"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import {
    ShieldAlert, Flag, EyeOff, Check, ExternalLink, Loader2,
    Bot, Inbox,
} from "lucide-react";

interface Author { name: string | null; username: string | null }
interface Target { preview: string; image: string | null; author: Author | null; link: string | null; exists: boolean }
interface Flag {
    id: string; module: string; targetType: string;
    reportCount: number; lastReason: string | null;
    aiVerdict: "OK" | "REVIEW" | "BLOCK" | null;
    aiCategories: string[]; aiSeverity: number | null; aiReason: string | null;
    status: "PENDING" | "KEPT" | "HIDDEN" | "AUTO_HIDDEN";
    createdAt: string; target: Target;
}

const STATUS_TABS = [
    { key: "PENDING", label: "Kutilmoqda" },
    { key: "AUTO_HIDDEN", label: "Avto-yashirilgan" },
    { key: "ALL", label: "Hammasi" },
] as const;
const MODULE_CHIPS = [
    { key: "ALL", label: "Hammasi" },
    { key: "MARKET", label: "Market" },
    { key: "NEXUS", label: "Nexus" },
] as const;

const CAT_LABEL: Record<string, string> = {
    scam: "Firibgarlik", adult: "Nomaqbul", hate: "Nafrat", violence: "Zo'ravonlik",
    illegal: "Noqonuniy", spam: "Spam", offtopic: "Mavzudan tashqari",
};
const TT_LABEL: Record<string, string> = {
    PRODUCT: "Mahsulot", REVIEW: "Sharh", REPLY: "Javob", QUESTION: "Savol",
    ANSWER: "Javob", POST: "Post", COMMENT: "Izoh",
};
const VERDICT: Record<string, { label: string; cls: string; bar: string }> = {
    OK: { label: "OK", cls: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300", bar: "bg-green-500" },
    REVIEW: { label: "Ko'rib chiqilsin", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", bar: "bg-amber-500" },
    BLOCK: { label: "Bloklash tavsiya", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", bar: "bg-red-500" },
};
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "Kutilmoqda", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
    AUTO_HIDDEN: { label: "Avto-yashirilgan", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
    KEPT: { label: "Saqlangan", cls: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" },
    HIDDEN: { label: "Yashirilgan", cls: "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-white/50" },
};

export function ModerationQueue() {
    const [status, setStatus] = useState<string>("PENDING");
    const [mod, setMod] = useState<string>("ALL");
    const [flags, setFlags] = useState<Flag[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setErr(null);
        try {
            const res = await fetch(`/api/admin/moderation?status=${status}&module=${mod}`);
            const d = await res.json();
            if (!res.ok) { setErr(d.error || "Xatolik"); setFlags([]); }
            else {
                setFlags(d.flags || []);
                const c: Record<string, number> = {};
                (d.counts || []).forEach((x: { status: string; _count: number }) => { c[x.status] = x._count; });
                setCounts(c);
            }
        } catch {
            setErr("Internet xatosi");
        } finally { setLoading(false); }
    }, [status, mod]);

    useEffect(() => { load(); }, [load]);

    async function act(id: string, action: "keep" | "hide") {
        setBusy(id);
        try {
            const res = await fetch(`/api/admin/moderation/${id}/action`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                setFlags(f => f.filter(x => x.id !== id));
                setCounts(c => ({ ...c, PENDING: Math.max(0, (c.PENDING || 1) - 1) }));
            }
        } finally { setBusy(null); }
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Sarlavha */}
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <ShieldAlert size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Moderatsiya navbati</h1>
                    <p className="text-xs text-gray-400 dark:text-white/30">AI + foydalanuvchi shikoyatlari</p>
                </div>
            </div>

            {/* Status tablari */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                {STATUS_TABS.map(t => (
                    <button key={t.key} onClick={() => setStatus(t.key)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${status === t.key
                            ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                            : "bg-white dark:bg-white/[0.05] text-gray-500 dark:text-white/40 border border-gray-200 dark:border-white/[0.06]"}`}>
                        {t.label}
                        {t.key === "PENDING" && counts.PENDING > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${status === t.key ? "bg-white/20" : "bg-red-500 text-white"}`}>{counts.PENDING}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Modul chiplar */}
            <div className="flex gap-1.5 mb-5">
                {MODULE_CHIPS.map(c => (
                    <button key={c.key} onClick={() => setMod(c.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${mod === c.key
                            ? "bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white"
                            : "text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60"}`}>
                        {c.label}
                    </button>
                ))}
            </div>

            {/* Ro'yxat */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
            ) : err ? (
                <div className="text-center py-20 text-sm text-red-500">{err}</div>
            ) : flags.length === 0 ? (
                <div className="text-center py-20">
                    <Inbox size={40} className="mx-auto text-gray-200 dark:text-white/10 mb-3" />
                    <p className="text-sm text-gray-400 dark:text-white/30">Bu yerda hech narsa yo'q. Toza!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {flags.map(f => <FlagCard key={f.id} f={f} busy={busy === f.id} onAct={act} />)}
                </div>
            )}
        </div>
    );
}

function FlagCard({ f, busy, onAct }: { f: Flag; busy: boolean; onAct: (id: string, a: "keep" | "hide") => void }) {
    const v = f.aiVerdict ? VERDICT[f.aiVerdict] : null;
    const sev = f.aiSeverity != null ? Math.round(f.aiSeverity * 100) : null;
    const st = STATUS_BADGE[f.status];

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] p-4">
            {/* Yuqori qator: turi + holat + AI verdict */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40">
                    {f.module === "NEXUS" ? "Nexus" : "Market"} · {TT_LABEL[f.targetType] || f.targetType}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                {v && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${v.cls}`}>
                        <Bot size={11} /> {v.label}
                    </span>
                )}
                {f.reportCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300 flex items-center gap-1">
                        <Flag size={10} /> {f.reportCount} shikoyat
                    </span>
                )}
            </div>

            {/* Kontent ko'rinishi */}
            <div className="flex gap-3">
                {f.target.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.target.image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-white/5" />
                )}
                <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${f.target.exists ? "text-gray-800 dark:text-white/80" : "text-gray-400 italic"}`}>
                        {f.target.preview.length > 240 ? f.target.preview.slice(0, 240) + "…" : f.target.preview}
                    </p>
                    {f.target.author && (
                        <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">
                            Muallif: {f.target.author.name || (f.target.author.username ? "@" + f.target.author.username : "—")}
                        </p>
                    )}
                </div>
            </div>

            {/* AI severity + kategoriyalar */}
            {(sev != null || f.aiCategories.length > 0) && (
                <div className="mt-3 space-y-2">
                    {sev != null && v && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 dark:text-white/30 w-14">Jiddiylik</span>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                                <div className={`h-full ${v.bar}`} style={{ width: `${sev}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-white/40 w-8 text-right">{sev}%</span>
                        </div>
                    )}
                    {f.aiCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {f.aiCategories.map(c => (
                                <span key={c} className="px-1.5 py-0.5 rounded text-[10px] bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300">
                                    {CAT_LABEL[c] || c}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* AI sababi + shikoyat sababi */}
            {f.aiReason && (
                <p className="mt-2 text-[11px] text-gray-500 dark:text-white/40 flex items-start gap-1.5">
                    <Bot size={12} className="mt-0.5 flex-shrink-0 text-violet-400" /> {f.aiReason}
                </p>
            )}
            {f.lastReason && (
                <p className="mt-1 text-[11px] text-gray-500 dark:text-white/40 flex items-start gap-1.5">
                    <Flag size={12} className="mt-0.5 flex-shrink-0 text-orange-400" /> &ldquo;{f.lastReason}&rdquo;
                </p>
            )}

            {/* Harakatlar */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
                {f.target.link && f.target.exists && (
                    <Link href={f.target.link} target="_blank" rel="noopener"
                        className="flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60 mr-auto">
                        <ExternalLink size={13} /> Ko'rish
                    </Link>
                )}
                <button onClick={() => onAct(f.id, "keep")} disabled={busy}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/20 disabled:opacity-40 transition ml-auto">
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Saqlash
                </button>
                <button onClick={() => onAct(f.id, "hide")} disabled={busy}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition">
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />} Yashirish
                </button>
            </div>
        </div>
    );
}
