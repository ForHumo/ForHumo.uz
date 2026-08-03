"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Store, Check, X, Loader2, Phone, MapPin, FileText, Building2 } from "lucide-react";

interface Seller {
    id: string; yattNumber: string; fullName: string; phone: string;
    shopName: string; shopSlug: string; description: string | null;
    address: string | null; city: string;
    bankName: string | null; bankAccount: string | null; bankMFO: string | null;
    passportSeries: string | null; passportNumber: string | null;
    createdAt: string;
    applicant: { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null } | null;
}

export function AdminBnSellers() {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [reasons, setReasons] = useState<Record<string, string>>({});
    const [forbidden, setForbidden] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/admin/bn-sellers");
            if (r.status === 403) { setForbidden(true); return; }
            const d = await r.json();
            setSellers(d.sellers ?? []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function decide(id: string, action: "approve" | "reject") {
        if (busyId) return;
        setBusyId(id);
        try {
            const r = await fetch("/api/admin/bn-sellers", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sellerId: id, action, reason: reasons[id] || "" }),
            });
            if (r.ok) {
                setSellers(prev => prev.filter(s => s.id !== id));
                setReasons(rs => { const nn = { ...rs }; delete nn[id]; return nn; });
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
                    <p className="text-sm mt-1" style={{ color: "rgba(140,160,210,0.75)" }}>Faqat asoschilar uchun</p>
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
                    <Store className="w-4 h-4" style={{ color: "#EAB308" }} />
                    <span className="text-sm font-black text-white">BN sellers</span>
                    {sellers.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: "rgba(234,179,8,0.20)", color: "#EAB308" }}>
                            {sellers.length}
                        </span>
                    )}
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-6 pb-20">
                {loading ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EAB308" }} /></div>
                ) : sellers.length === 0 ? (
                    <div className="flex flex-col items-center py-24 text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.20)" }}>
                            <Store className="w-6 h-6" style={{ color: "rgba(234,179,8,0.60)" }} />
                        </div>
                        <p className="text-sm font-bold text-white">PENDING seller yo&apos;q</p>
                        <p className="text-xs" style={{ color: "rgba(120,140,185,0.75)" }}>Barcha arizalar javob berilgan</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sellers.map(s => (
                            <div key={s.id} className="rounded-2xl overflow-hidden"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                {/* Header */}
                                <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)" }}>
                                        <Store className="w-5 h-5" style={{ color: "#EAB308" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{s.shopName}</p>
                                        <p className="text-[11px] truncate" style={{ color: "rgba(140,160,210,0.75)" }}>bozornarxida.uz/shop/{s.shopSlug}</p>
                                    </div>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.65)" }}>{new Date(s.createdAt).toLocaleDateString("uz-UZ")}</p>
                                </div>

                                {/* YaTT + Person */}
                                <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs" style={{ background: "rgba(43,62,232,0.04)" }}>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: "rgba(140,160,210,0.75)" }}>
                                            <FileText className="w-3 h-3" /> YaTT
                                        </p>
                                        <p className="font-bold text-white">{s.yattNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>F.I.SH.</p>
                                        <p className="font-bold text-white truncate">{s.fullName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: "rgba(140,160,210,0.75)" }}>
                                            <Phone className="w-3 h-3" /> Tel
                                        </p>
                                        <p className="font-bold text-white">{s.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: "rgba(140,160,210,0.75)" }}>
                                            <MapPin className="w-3 h-3" /> Shahar
                                        </p>
                                        <p className="font-bold text-white">{s.city}</p>
                                    </div>
                                </div>

                                {/* Passport + Bank */}
                                {(s.passportSeries || s.bankName) && (
                                    <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                        {s.passportSeries && (
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>Passport</p>
                                                <p className="font-bold text-white">{s.passportSeries} {s.passportNumber}</p>
                                            </div>
                                        )}
                                        {s.bankName && (
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: "rgba(140,160,210,0.75)" }}>
                                                    <Building2 className="w-3 h-3" /> Bank
                                                </p>
                                                <p className="font-bold text-white text-[11px] truncate">{s.bankName}</p>
                                                {s.bankAccount && <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.75)" }}>{s.bankAccount}</p>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Address + description */}
                                {(s.address || s.description) && (
                                    <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                        {s.address && <p className="text-xs mb-1" style={{ color: "rgba(220,230,255,0.90)" }}><MapPin className="inline w-3 h-3 mr-1" />{s.address}</p>}
                                        {s.description && <p className="text-[11px] italic" style={{ color: "rgba(200,215,245,0.80)" }}>&ldquo;{s.description}&rdquo;</p>}
                                    </div>
                                )}

                                {/* Decision */}
                                <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)", background: "rgba(43,62,232,0.04)" }}>
                                    <input type="text" placeholder="Rad etish sababi (agar rad qilinsa)"
                                        value={reasons[s.id] || ""} onChange={e => setReasons(rs => ({ ...rs, [s.id]: e.target.value.slice(0, 500) }))}
                                        className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
                                        style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.20)" }} />
                                    <div className="flex gap-2">
                                        <button onClick={() => decide(s.id, "approve")} disabled={busyId === s.id}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-black disabled:opacity-50"
                                            style={{ background: "#EAB308" }}>
                                            {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            Tasdiqlash
                                        </button>
                                        <button onClick={() => decide(s.id, "reject")} disabled={busyId === s.id}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black disabled:opacity-50"
                                            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ff8a96" }}>
                                            {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
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
