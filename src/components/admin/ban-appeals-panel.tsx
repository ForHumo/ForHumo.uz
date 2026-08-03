"use client";

// Asoschi uchun ban arizalari paneli — foydalanuvchilar bloklangan bo'lsa
// va ariza yuborgan bo'lsa, shu yerda ko'rib chiqiladi.

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, ShieldCheck, Check, X, Loader2, Clock, AlertTriangle, MessageSquare } from "lucide-react";
import { BAN_LABELS } from "@/lib/moderation-ladder";

interface Appeal {
    id: string;
    profile: { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null } | null;
    level: number;
    reason: string;
    category: string;
    contextSnippet: string | null;
    aiVerdict: string | null;
    aiSeverity: number | null;
    aiRelationScore: number | null;
    issuedAt: string;
    expiresAt: string | null;
    appealAt: string;
    appealText: string | null;
}

function avatarOf(p: Appeal["profile"]) {
    return p?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(p?.username || p?.name || "u")}`;
}

function timeAgo(iso: string) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "Hozir";
    if (m < 60) return `${m} daq oldin`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} soat oldin`;
    return new Date(iso).toLocaleDateString("uz-UZ");
}

export function BanAppealsPanel() {
    const [appeals, setAppeals] = useState<Appeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [forbidden, setForbidden] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/admin/ban-appeals");
            if (r.status === 403) { setForbidden(true); return; }
            const d = await r.json();
            setAppeals(d.appeals ?? []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function decide(id: string, action: "lift" | "keep") {
        if (busyId) return;
        setBusyId(id);
        try {
            const r = await fetch("/api/admin/ban-appeals", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ banId: id, action, note: notes[id] || "" }),
            });
            if (r.ok) {
                setAppeals(prev => prev.filter(a => a.id !== id));
                setNotes(n => { const nn = { ...n }; delete nn[id]; return nn; });
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d.error || "Xato");
            }
        } finally { setBusyId(null); }
    }

    if (forbidden) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white" style={{ background: "#050818" }}>
                <div className="text-center px-6">
                    <p className="text-lg font-black">Ruxsat yo&apos;q</p>
                    <p className="text-sm mt-1" style={{ color: "rgba(140,160,210,0.75)" }}>Bu sahifa faqat asoschilar uchun</p>
                    <Link href="/nexus" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        Nexus&apos;ga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white" style={{ background: "#050818" }}>
            <header className="sticky top-0 z-20 flex items-center gap-3 px-4 h-14 backdrop-blur-xl"
                style={{ background: "rgba(5,8,24,0.80)", borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <Link href="/admin/moderation" className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(43,62,232,0.12)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </Link>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" style={{ color: "#00CEC8" }} />
                    <span className="text-sm font-black text-white">Ban arizalari</span>
                    {appeals.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: "rgba(239,68,68,0.20)", color: "#ff8a96" }}>
                            {appeals.length}
                        </span>
                    )}
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-6 pb-20">
                {loading ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                ) : appeals.length === 0 ? (
                    <div className="flex flex-col items-center py-24 text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                            <ShieldCheck className="w-6 h-6" style={{ color: "rgba(43,62,232,0.40)" }} />
                        </div>
                        <p className="text-sm font-bold text-white">Ko&apos;rib chiqiladigan ariza yo&apos;q</p>
                        <p className="text-xs" style={{ color: "rgba(120,140,185,0.75)" }}>Barcha arizalar javob berilgan</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {appeals.map(a => (
                            <div key={a.id} className="rounded-2xl overflow-hidden"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                {/* Applicant + timing */}
                                <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                                    <img src={avatarOf(a.profile)} alt="" className="w-11 h-11 rounded-xl object-cover bg-white flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{a.profile?.name || a.profile?.username || "Foydalanuvchi"}</p>
                                        <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.75)" }}>
                                            @{a.profile?.username || "?"} · {a.profile?.humoId || ""}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.65)" }}>Ariza:</p>
                                        <p className="text-[11px] font-bold" style={{ color: "#00CEC8" }}>{timeAgo(a.appealAt)}</p>
                                    </div>
                                </div>

                                {/* Ban details */}
                                <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs" style={{ background: "rgba(43,62,232,0.04)" }}>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>Sabab</p>
                                        <p className="font-bold text-white">{a.reason}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>Muddat</p>
                                        <p className="font-bold text-white">{BAN_LABELS[a.level] || `Lvl ${a.level}`}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>AI severity</p>
                                        <p className="font-bold text-white">{a.aiSeverity !== null ? `${(a.aiSeverity * 100).toFixed(0)}%` : "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>Yaqinlik balli</p>
                                        <p className="font-bold text-white">{a.aiRelationScore !== null ? `${a.aiRelationScore}/100` : "—"}</p>
                                    </div>
                                </div>

                                {/* Context snippet (AI ko'rgan matn) */}
                                {a.contextSnippet && (
                                    <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>
                                            <AlertTriangle className="w-3 h-3" />Xabar matni (AI ko'rgan)
                                        </p>
                                        <p className="text-xs leading-relaxed px-3 py-2 rounded-lg italic" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(220,230,255,0.90)" }}>
                                            &ldquo;{a.contextSnippet}&rdquo;
                                        </p>
                                    </div>
                                )}

                                {/* User appeal text */}
                                <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: "rgba(0,206,200,0.85)" }}>
                                        <MessageSquare className="w-3 h-3" />Foydalanuvchi arizasi
                                    </p>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(220,230,255,0.95)" }}>
                                        {a.appealText || "(bo'sh)"}
                                    </p>
                                </div>

                                {/* Decision */}
                                <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)", background: "rgba(43,62,232,0.04)" }}>
                                    <input type="text" placeholder="Qaror izohi (ixtiyoriy — foydalanuvchiga ko'rinmaydi)"
                                        value={notes[a.id] || ""} onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value.slice(0, 300) }))}
                                        className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
                                        style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }} />
                                    <div className="flex gap-2">
                                        <button onClick={() => decide(a.id, "lift")} disabled={busyId === a.id}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50"
                                            style={{ background: "linear-gradient(135deg,#10B981,#00CEC8)" }}>
                                            {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            Blokni bekor qilish
                                        </button>
                                        <button onClick={() => decide(a.id, "keep")} disabled={busyId === a.id}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black disabled:opacity-50"
                                            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ff8a96" }}>
                                            {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                            Rad etish
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
