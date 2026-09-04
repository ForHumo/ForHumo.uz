"use client";

// Foydalanuvchi bilim bazasi dashboardi (transparency + control).
// For Humo AI siz haqingizda to'plagan hamma narsani ko'rasiz,
// tahrir qilishingiz yoki hammasini o'chirib tashlashingiz mumkin.

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Loader2, ShieldCheck, Trash2, Plus, Edit3,
    Lock, Sparkles, User, Users, Briefcase, Heart, Home as HomeIcon,
    Target, Book, Package, Activity, MoreHorizontal, AlertTriangle, LogIn,
} from "lucide-react";
import { moduleTheme } from "@/lib/module-theme";

interface Fact {
    id: string;
    category: string;
    key: string;
    value: string;
    source: string;
    confidence: number;
    sensitive: boolean;
    verifiedByUser: boolean;
    createdAt: string;
    updatedAt: string;
}

const CATEGORY_META: Record<string, { label: string; icon: typeof User; color: string }> = {
    identity:  { label: "Shaxsiy",     icon: User,          color: "#3B82F6" },
    family:    { label: "Oila",        icon: Users,         color: "#EC4899" },
    work:      { label: "Ish/Ta'lim",  icon: Briefcase,     color: "#8B5CF6" },
    interests: { label: "Qiziqishlar", icon: Heart,         color: "#EF4444" },
    lifestyle: { label: "Turmush tarz",icon: Activity,      color: "#F59E0B" },
    goals:     { label: "Maqsadlar",   icon: Target,        color: "#14B8A6" },
    contacts:  { label: "Kontaktlar",  icon: Book,          color: "#10B981" },
    assets:    { label: "Mulk",        icon: HomeIcon,      color: "#6366F1" },
    habits:    { label: "Odatlar",     icon: Package,       color: "#06B6D4" },
    other:     { label: "Boshqa",      icon: MoreHorizontal,color: "#78716C" },
};

const SOURCE_LABEL: Record<string, string> = {
    user:        "O'zim kiritdim",
    onboarding:  "Ro'yxatdan o'tish",
    ai_extract:  "AI suhbatdan",
};

const T = moduleTheme("id");

export function KnowledgeDashboard() {
    const { status } = useSession();
    const [grouped, setGrouped] = useState<Record<string, Fact[]>>({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [showAddFor, setShowAddFor] = useState<string | null>(null);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [newSensitive, setNewSensitive] = useState(false);

    const load = useCallback(async () => {
        if (status !== "authenticated") return;
        setLoading(true);
        try {
            const r = await fetch("/api/ai/knowledge", { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setGrouped(j.grouped ?? {});
                setTotal(j.total ?? 0);
            }
        } finally { setLoading(false); }
    }, [status]);

    useEffect(() => { load(); }, [load]);

    async function saveFact(cat: string) {
        if (!newKey.trim() || !newValue.trim()) return;
        setBusy(true);
        try {
            const r = await fetch("/api/ai/knowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: cat, key: newKey.trim(), value: newValue.trim(),
                    sensitive: newSensitive,
                }),
            });
            if (r.ok) {
                setShowAddFor(null);
                setNewKey(""); setNewValue(""); setNewSensitive(false);
                await load();
            }
        } finally { setBusy(false); }
    }

    async function deleteFact(id: string) {
        if (!confirm("Ushbu ma'lumotni o'chirasizmi? AI endi bilmaydi.")) return;
        setBusy(true);
        try {
            const r = await fetch(`/api/ai/knowledge?id=${id}`, { method: "DELETE" });
            if (r.ok) await load();
        } finally { setBusy(false); }
    }

    async function eraseAll() {
        if (!confirm("BUTUN bilim bazani o'chirasizmi? Bu qaytmas. AI sizni yangi tomon o'rganib boshlaydi.")) return;
        setBusy(true);
        try {
            const r = await fetch("/api/ai/knowledge?all=1", { method: "DELETE" });
            if (r.ok) await load();
        } finally { setBusy(false); }
    }

    if (status === "unauthenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="max-w-sm w-full text-center rounded-3xl p-8 border" style={{ borderColor: T.border }}>
                    <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
                        style={{ background: T.gradient, color: T.onPrimary }}>
                        <ShieldCheck className="w-7 h-7" />
                    </span>
                    <h1 className="text-xl font-black mb-2">Bilim bazam</h1>
                    <p className="text-sm text-muted-foreground mb-4">
                        Ko'rish uchun tizimga kiring.
                    </p>
                    <button onClick={() => signIn("google")}
                        className="w-full h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                        style={{ background: T.gradient }}>
                        <LogIn className="w-4 h-4" /> Google bilan kirish
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-3xl mx-auto space-y-6">

                <Link href="/id" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={15} /> Profilga qaytish
                </Link>

                {/* Hero */}
                <div className="rounded-3xl p-6 border" style={{ borderColor: T.border, background: T.soft }}>
                    <div className="flex items-start gap-3 mb-3">
                        <span className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                            style={{ background: T.gradient, color: T.onPrimary }}>
                            <Sparkles className="w-5 h-5" />
                        </span>
                        <div>
                            <h1 className="text-xl font-black">Bilim bazam</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                For Humo AI siz haqingizda {total} ta ma&apos;lumot bilib oldi.
                                Faqat siz ko&apos;rasiz — barcha ma&apos;lumot shifrlangan.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] mt-4 pt-4 border-t" style={{ borderColor: T.border }}>
                        <span className="flex items-center gap-1" style={{ color: T.primary }}>
                            <Lock className="w-3 h-3" /> AES-256-GCM shifrlangan
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">Admin ham ko&apos;ra olmaydi</span>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.primary }} /></div>
                )}

                {!loading && (
                    <div className="space-y-4">
                        {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                            const facts = grouped[cat] ?? [];
                            const Icon = meta.icon;
                            const isEmpty = facts.length === 0;
                            const showingAdd = showAddFor === cat;

                            return (
                                <div key={cat} className="rounded-2xl border overflow-hidden"
                                    style={{ borderColor: T.border, background: "var(--card, transparent)" }}>
                                    <div className="px-4 py-3 flex items-center justify-between"
                                        style={{ background: `${meta.color}0d` }}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg grid place-items-center"
                                                style={{ background: `${meta.color}22`, color: meta.color }}>
                                                <Icon className="w-4 h-4" />
                                            </span>
                                            <div>
                                                <p className="text-[13px] font-black">{meta.label}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {isEmpty ? "hali ma'lumot yo'q" : `${facts.length} ta fakt`}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setShowAddFor(showingAdd ? null : cat); setNewKey(""); setNewValue(""); }}
                                            className="w-8 h-8 rounded-lg grid place-items-center hover:brightness-95"
                                            style={{ background: T.soft, color: T.primary }}>
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {facts.length > 0 && (
                                        <div className="divide-y" style={{ borderColor: T.border }}>
                                            {facts.map(f => (
                                                <div key={f.id} className="px-4 py-2.5 flex items-start gap-3 group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[11px] text-muted-foreground font-mono">{f.key}</span>
                                                            {f.sensitive && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                                                    style={{ background: "#FEE2E2", color: "#B91C1C" }}>MAXFIY</span>
                                                            )}
                                                            {f.verifiedByUser && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                                                    style={{ background: "#D1FAE5", color: "#065F46" }}>tasdiqladim</span>
                                                            )}
                                                            {f.confidence < 0.7 && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                                                    style={{ background: "#FEF3C7", color: "#92400E" }}>
                                                                    Ishonch {Math.round(f.confidence * 100)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[13px] mt-0.5" style={{ color: "var(--foreground)" }}>{f.value}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            {SOURCE_LABEL[f.source] ?? f.source} · {new Date(f.updatedAt).toLocaleDateString("uz-UZ")}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => deleteFact(f.id)}
                                                        disabled={busy}
                                                        title="O'chirish"
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 text-red-500 disabled:opacity-50">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {showingAdd && (
                                        <div className="px-4 py-3 space-y-2 border-t" style={{ borderColor: T.border, background: T.soft }}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <input
                                                    placeholder="Kalit (masalan: city, hobby, car_model)"
                                                    value={newKey}
                                                    onChange={e => setNewKey(e.target.value.slice(0, 60))}
                                                    className="h-9 px-3 rounded-lg text-xs border font-mono"
                                                    style={{ borderColor: T.border }} />
                                                <input
                                                    placeholder="Qiymat (masalan: Toshkent, chess, Chevrolet)"
                                                    value={newValue}
                                                    onChange={e => setNewValue(e.target.value.slice(0, 500))}
                                                    className="h-9 px-3 rounded-lg text-xs border"
                                                    style={{ borderColor: T.border }} />
                                            </div>
                                            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                                                <input type="checkbox" checked={newSensitive} onChange={e => setNewSensitive(e.target.checked)} />
                                                Bu maxfiy ma&apos;lumot (AI ehtiyot bilan ishlatadi)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => saveFact(cat)}
                                                    disabled={busy || !newKey.trim() || !newValue.trim()}
                                                    className="h-9 px-3 rounded-lg text-xs font-black text-white disabled:opacity-50"
                                                    style={{ background: T.gradient }}>
                                                    Saqlash
                                                </button>
                                                <button onClick={() => setShowAddFor(null)}
                                                    className="h-9 px-3 rounded-lg text-xs font-medium">
                                                    Bekor
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* GDPR — hammasini o'chirish */}
                {total > 0 && (
                    <div className="rounded-2xl p-4 border" style={{ borderColor: "#FEE2E2", background: "#FEF2F2" }}>
                        <div className="flex items-start gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[13px] font-black text-red-900">Butun bilim bazani o&apos;chirish</p>
                                <p className="text-[11px] text-red-700 mt-0.5">
                                    Barcha to&apos;plangan ma&apos;lumotlar butunlay o&apos;chiriladi.
                                    AI sizni yangi tomondan o&apos;rgana boshlaydi. Bu qaytmas.
                                </p>
                            </div>
                        </div>
                        <button onClick={eraseAll} disabled={busy}
                            className="h-9 px-4 rounded-lg text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Hammasini o'chirish"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Unused import guard
void Edit3;
