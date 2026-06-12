"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { ArrowLeft, Loader2, BadgeCheck, ShieldCheck, Clock, Send, Check, X, Plus, Trash2 } from "lucide-react";

interface QueueItem {
    id: string; profileId: string; fullName: string; category: string; reason: string; links: string[]; createdAt: string;
    applicant: { name: string | null; username: string | null; image: string | null } | null;
}
interface VerifyResp {
    verified: boolean; isFounder: boolean;
    request: { status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string } | null;
    queue: QueueItem[];
}

function avatarOf(a: { username?: string | null; name?: string | null; image?: string | null } | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "u")}`;
}

export function NexusVerify() {
    const router = useRouter();
    const [data, setData] = useState<VerifyResp | null>(null);
    const [loading, setLoading] = useState(true);

    // Ariza formasi
    const [fullName, setFullName] = useState("");
    const [category, setCategory] = useState("");
    const [reason, setReason] = useState("");
    const [links, setLinks] = useState<string[]>([""]);
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        fetch("/api/nexus/verify").then(r => r.json()).then(d => { if (!d.error) setData(d); }).finally(() => setLoading(false));
    };
    useEffect(load, []);

    async function submit() {
        if (submitting) return;
        setErr(null);
        if (!fullName.trim() || !category.trim() || !reason.trim()) { setErr("Ism, toifa va sabab kerak"); return; }
        setSubmitting(true);
        try {
            const res = await fetch("/api/nexus/verify", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, category, reason, links: links.filter(l => l.trim()) }),
            });
            const d = await res.json();
            if (!res.ok) { setErr(d.error || "Xatolik"); return; }
            load();
        } finally { setSubmitting(false); }
    }

    async function review(requestId: string, action: "approve" | "reject") {
        setData(d => d ? { ...d, queue: d.queue.filter(q => q.id !== requestId) } : d);
        await fetch("/api/nexus/verify", {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, action }),
        }).catch(() => { });
    }

    const CATEGORIES = ["Bloger", "Musiqachi", "Jurnalist", "Brend / kompaniya", "Sportchi", "Davlat tashkiloti", "Boshqa"];

    return (
        <div className="h-full overflow-y-auto text-white" style={{ background: "#050818" }}>
            <header className="sticky top-0 z-20 flex items-center gap-3 px-3 h-14 backdrop-blur-xl"
                style={{ background: "rgba(5,8,24,0.80)", borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(43,62,232,0.12)" }}>
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" style={{ color: "#00CEC8" }} />
                    <span className="text-sm font-black text-white">Tasdiqlanish</span>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2B3EE8" }} /></div>
            ) : !data ? (
                <div className="flex flex-col items-center py-24 px-6 text-center">
                    <p className="text-sm font-bold text-white/70">Ma&apos;lumot yuklanmadi</p>
                    <Link href="/nexus" className="mt-4 px-5 py-2.5 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>Nexus&apos;ga qaytish</Link>
                </div>
            ) : (
                <div className="px-4 py-4 pb-28 max-w-2xl mx-auto">
                    {/* Founder navbati */}
                    {data.isFounder && (
                        <div className="mb-6">
                            <p className="text-[11px] font-black uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5" style={{ color: "#00CEC8" }}>
                                <ShieldCheck className="w-3.5 h-3.5" />Ko&apos;rib chiqish navbati ({data.queue.length})
                            </p>
                            {data.queue.length === 0 ? (
                                <p className="text-xs px-1 py-4" style={{ color: "rgba(120,140,185,0.7)" }}>Yangi ariza yo&apos;q</p>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {data.queue.map(q => (
                                        <div key={q.id} className="rounded-2xl p-3.5" style={{ background: "rgba(11,18,40,0.6)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                            <div className="flex items-center gap-2.5 mb-2">
                                                <img src={avatarOf(q.applicant)} alt="" className="w-9 h-9 rounded-xl object-cover bg-white" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-white truncate">{q.fullName}</p>
                                                    <p className="text-[11px] truncate" style={{ color: "#00CEC8" }}>@{q.applicant?.username} · {q.category}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(200,215,245,0.85)" }}>{q.reason}</p>
                                            {q.links.length > 0 && (
                                                <div className="flex flex-col gap-0.5 mb-2.5">
                                                    {q.links.map((l, i) => <span key={i} className="text-[11px] truncate" style={{ color: "rgba(120,150,220,0.9)" }}>{l}</span>)}
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <button onClick={() => review(q.id, "approve")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#10B981,#00CEC8)" }}>
                                                    <Check className="w-3.5 h-3.5" /> Tasdiqlash
                                                </button>
                                                <button onClick={() => review(q.id, "reject")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ff8a96" }}>
                                                    <X className="w-3.5 h-3.5" /> Rad etish
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Foydalanuvchi holati */}
                    {data.verified ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.35)" }}>
                                <BadgeCheck className="w-8 h-8" style={{ color: "#00CEC8" }} />
                            </div>
                            <p className="text-lg font-black text-white">Siz tasdiqlangansiz</p>
                            <p className="text-sm mt-1" style={{ color: "rgba(180,200,240,0.8)" }}>Profilingizda ko&apos;k belgi ko&apos;rinadi</p>
                        </div>
                    ) : data.request?.status === "PENDING" ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}>
                                <Clock className="w-8 h-8" style={{ color: "#F59E0B" }} />
                            </div>
                            <p className="text-lg font-black text-white">Ariza ko&apos;rib chiqilmoqda</p>
                            <p className="text-sm mt-1" style={{ color: "rgba(180,200,240,0.8)" }}>Tez orada javob beramiz</p>
                        </div>
                    ) : (
                        <div>
                            <div className="flex flex-col items-center text-center mb-5">
                                <BadgeCheck className="w-10 h-10 mb-2" style={{ color: "#00CEC8" }} />
                                <p className="text-base font-black text-white">Ko&apos;k belgi uchun ariza</p>
                                <p className="text-xs mt-1 max-w-sm" style={{ color: "rgba(120,140,185,0.8)" }}>
                                    {data.request?.status === "REJECTED" ? "Avvalgi ariza rad etilgan. Qayta ariza berishingiz mumkin." : "Mashhur ijodkor, brend yoki tashkilot bo'lsangiz — tasdiqlanish so'rang"}
                                </p>
                            </div>

                            <label className="text-[11px] font-bold block mb-1.5 px-1" style={{ color: "rgba(150,170,210,0.85)" }}>Haqiqiy ism / nom</label>
                            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Masalan: Ali Valiyev"
                                className="w-full px-3.5 py-3 rounded-xl text-sm text-white outline-none mb-3" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />

                            <label className="text-[11px] font-bold block mb-1.5 px-1" style={{ color: "rgba(150,170,210,0.85)" }}>Toifa</label>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {CATEGORIES.map(c => (
                                    <button key={c} onClick={() => setCategory(c)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95"
                                        style={category === c ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.2)", color: "rgba(160,180,230,0.85)" }}>
                                        {c}
                                    </button>
                                ))}
                            </div>

                            <label className="text-[11px] font-bold block mb-1.5 px-1" style={{ color: "rgba(150,170,210,0.85)" }}>Nega tasdiqlanishingiz kerak?</label>
                            <textarea value={reason} onChange={e => setReason(e.target.value.slice(0, 1000))} rows={4} placeholder="Faoliyatingiz, mashhurligingiz haqida qisqacha..."
                                className="w-full px-3.5 py-3 rounded-xl text-sm text-white outline-none resize-none mb-3" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />

                            <label className="text-[11px] font-bold block mb-1.5 px-1" style={{ color: "rgba(150,170,210,0.85)" }}>Havolalar (ijtimoiy tarmoq, OAV)</label>
                            {links.map((l, i) => (
                                <div key={i} className="flex gap-2 mb-2">
                                    <input value={l} onChange={e => setLinks(ls => ls.map((x, j) => j === i ? e.target.value : x))} placeholder="https://..."
                                        className="flex-1 px-3.5 py-2.5 rounded-xl text-sm text-white outline-none" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                                    {links.length > 1 && (
                                        <button onClick={() => setLinks(ls => ls.filter((_, j) => j !== i))} className="w-10 flex items-center justify-center rounded-xl" style={{ background: "rgba(239,68,68,0.1)" }}>
                                            <Trash2 className="w-4 h-4" style={{ color: "#ff8a96" }} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {links.length < 5 && (
                                <button onClick={() => setLinks(ls => [...ls, ""])} className="flex items-center gap-1.5 text-[11px] font-bold mb-4 px-1" style={{ color: "#00CEC8" }}>
                                    <Plus className="w-3.5 h-3.5" /> Havola qo&apos;shish
                                </button>
                            )}

                            {err && <p className="text-xs font-bold mb-3" style={{ color: "#EF4444" }}>{err}</p>}

                            <button onClick={submit} disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-50 active:scale-[0.99] transition"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 6px 24px rgba(43,62,232,0.35)" }}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Ariza yuborish
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
