"use client";

// BN Admin — Boykot brendlar boshqaruvi (OWNER only).

import { useEffect, useState } from "react";
import { BN } from "@/lib/bn-theme";
import { Ban, Plus, X, Loader2, Trash2 } from "lucide-react";

interface Brand {
    id: string;
    name: string;
    aliases: string[];
    reason: string;
    detail: string | null;
    categories: string[];
    addedAt: string;
}

export function BnAdminBoycott({ role }: { role: "OWNER" | "MODERATOR" }) {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState<Set<string>>(new Set());
    const isOwner = role === "OWNER";

    async function load() {
        setLoading(true);
        try {
            const r = await fetch("/api/bn/boycott");
            const d = await r.json();
            setBrands(d.brands ?? []);
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function remove(id: string) {
        if (!confirm("Bu brendni boykot ro'yxatidan olib tashlaysizmi?")) return;
        setBusy(s => new Set([...s, id]));
        try {
            const r = await fetch(`/api/bn/boycott/${id}`, { method: "DELETE" });
            if (r.ok) setBrands(prev => prev.filter(b => b.id !== id));
            else alert("Xatolik");
        } finally {
            setBusy(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    if (!isOwner) {
        return (
            <div className="rounded-2xl p-6 text-center" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <p className="text-[13px]" style={{ color: BN.text2 }}>Boykot ro&apos;yxatini faqat OWNER boshqara oladi.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-[16px] font-black" style={{ color: BN.text }}>Boykot brendlar</h2>
                    <p className="text-[12px] mt-0.5" style={{ color: BN.text3 }}>
                        Ushbu brendlar mahsuloti BN&apos;da sotilmaydi
                    </p>
                </div>
                <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-black"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    <Plus className="w-4 h-4" /> Yangi
                </button>
            </div>

            {loading ? (
                <div className="grid place-items-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : brands.length === 0 ? (
                <div
                    className="rounded-2xl p-8 text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <Ban className="w-8 h-8 mx-auto mb-2" style={{ color: BN.text3 }} />
                    <p className="text-[13px]" style={{ color: BN.text2 }}>Boykot ro&apos;yxati bo&apos;sh</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {brands.map(b => (
                        <div
                            key={b.id}
                            className="rounded-2xl p-4"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
                                    style={{ background: `${BN.err}18`, color: BN.err }}
                                >
                                    <Ban className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-black mb-0.5" style={{ color: BN.text }}>{b.name}</p>
                                    <p className="text-[13px]" style={{ color: BN.text }}>{b.reason}</p>
                                    {b.detail && <p className="text-[12px] mt-1" style={{ color: BN.text2 }}>{b.detail}</p>}
                                    {b.aliases.length > 0 && (
                                        <p className="text-[11px] mt-1.5" style={{ color: BN.text3 }}>
                                            Aliaslar: {b.aliases.join(", ")}
                                        </p>
                                    )}
                                    {b.categories.length > 0 && (
                                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                                            {b.categories.map(c => (
                                                <span
                                                    key={c}
                                                    className="text-[10.5px] font-black uppercase px-1.5 py-0.5 rounded-md leading-none"
                                                    style={{ background: BN.surfaceUp, color: BN.text3 }}
                                                >{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => remove(b.id)}
                                    disabled={busy.has(b.id)}
                                    className="w-9 h-9 grid place-items-center rounded-lg flex-shrink-0 disabled:opacity-60"
                                    style={{ background: `${BN.err}18`, color: BN.err }}
                                    aria-label="O'chirish"
                                >
                                    {busy.has(b.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {creating && <CreateModal onClose={() => setCreating(false)} onCreated={b => { setBrands(prev => [b, ...prev]); setCreating(false); }} />}
        </div>
    );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: Brand) => void }) {
    const [name, setName] = useState("");
    const [reason, setReason] = useState("");
    const [detail, setDetail] = useState("");
    const [aliases, setAliases] = useState("");
    const [categories, setCategories] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/bn/boycott", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    reason: reason.trim(),
                    detail: detail.trim() || null,
                    aliases: aliases.split(",").map(s => s.trim()).filter(Boolean),
                    categories: categories.split(",").map(s => s.trim()).filter(Boolean),
                }),
            });
            const d = await r.json();
            if (r.ok && d?.ok) onCreated(d.brand);
            else if (d?.error === "duplicate") setErr("Bu brend allaqachon boykot ro'yxatida");
            else setErr(d?.error ?? "Xatolik");
        } catch { setErr("Ulanish xatoligi"); }
        finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[130]">
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose} />
            <div
                className="absolute inset-y-0 right-0 w-full sm:w-[500px] overflow-y-auto"
                style={{ background: BN.surface, borderLeft: `1px solid ${BN.border}` }}
            >
                <div
                    className="sticky top-0 flex items-center justify-between h-16 px-4 z-10"
                    style={{ background: BN.surface, borderBottom: `1px solid ${BN.border}` }}
                >
                    <span className="text-[16px] font-black">Boykot brend qo&apos;shish</span>
                    <button onClick={onClose} aria-label="Yopish" className="w-9 h-9 grid place-items-center rounded-lg" style={{ background: BN.surfaceUp }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-3.5">
                    <div>
                        <label className="block text-[12px] font-semibold mb-1.5" style={{ color: BN.text2 }}>Brend nomi *</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Coca-Cola" className="w-full h-11 rounded-xl px-3.5 text-[14px]" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }} />
                    </div>
                    <div>
                        <label className="block text-[12px] font-semibold mb-1.5" style={{ color: BN.text2 }}>Sabab *</label>
                        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Boykot chaqiruvi (2024-yilda)" className="w-full h-11 rounded-xl px-3.5 text-[14px]" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }} />
                    </div>
                    <div>
                        <label className="block text-[12px] font-semibold mb-1.5" style={{ color: BN.text2 }}>Batafsil (ixtiyoriy)</label>
                        <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} className="w-full rounded-xl px-3.5 py-3 text-[13px]" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }} />
                    </div>
                    <div>
                        <label className="block text-[12px] font-semibold mb-1.5" style={{ color: BN.text2 }}>Aliaslar (vergul bilan)</label>
                        <input value={aliases} onChange={e => setAliases(e.target.value)} placeholder="coke, coca cola, кока-кола" className="w-full h-11 rounded-xl px-3.5 text-[14px]" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }} />
                        <p className="text-[11px] mt-1" style={{ color: BN.text3 }}>Mahsulot matnida shu so&apos;zlar topilsa ham bloklanadi</p>
                    </div>
                    <div>
                        <label className="block text-[12px] font-semibold mb-1.5" style={{ color: BN.text2 }}>Kategoriyalar (vergul bilan)</label>
                        <input value={categories} onChange={e => setCategories(e.target.value)} placeholder="ichimlik, siyosiy" className="w-full h-11 rounded-xl px-3.5 text-[14px]" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }} />
                    </div>
                    {err && <div className="p-3 rounded-xl text-[12.5px]" style={{ background: BN.errSoft, color: BN.err }}>{err}</div>}
                </div>

                <div className="sticky bottom-0 p-4" style={{ background: BN.surface, borderTop: `1px solid ${BN.border}` }}>
                    <button
                        onClick={submit}
                        disabled={busy || name.trim().length < 2 || reason.trim().length < 5}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black disabled:opacity-60"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Qo'shish"}
                    </button>
                </div>
            </div>
        </div>
    );
}
