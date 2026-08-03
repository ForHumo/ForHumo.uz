"use client";

import { useState, useEffect, useCallback } from "react";
import { AtSign, Plus, Trash2, Loader2, Search, X, Save } from "lucide-react";

interface Item {
    id: string;
    username: string;
    category: string;
    priceUzs: number | null;
    note: string | null;
    assignedToId: string | null;
    createdAt: string;
}

const CATEGORIES = [
    { key: "SYSTEM",     label: "Tizim",       color: "#EF4444" },
    { key: "VIP",        label: "VIP (pullik)", color: "#F59E0B" },
    { key: "CELEBRITY",  label: "Mashhur",      color: "#8B5CF6" },
    { key: "BRAND",      label: "Brend",        color: "#00CEC8" },
    { key: "COUNTRY",    label: "Davlat",       color: "#10B981" },
    { key: "GOVERNMENT", label: "Davlat organi", color: "#3B82F6" },
    { key: "PERSONAL",   label: "Yaqin odam",   color: "#EC4899" },
];

export function AdminReservedUsernames() {
    const [items, setItems] = useState<Item[]>([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<string>("");
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [addOpen, setAddOpen] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (q) params.set("q", q);
        params.set("page", String(page));
        fetch(`/api/admin/reserved-usernames?${params}`)
            .then(r => r.json())
            .then(d => {
                setItems(d.items ?? []);
                setTotal(d.total ?? 0);
                setCounts(d.counts ?? {});
            })
            .finally(() => setLoading(false));
    }, [category, q, page]);

    useEffect(() => { load(); }, [load]);

    async function remove(id: string, username: string) {
        if (!confirm(`@${username} ni zaxiradan olib tashlash?`)) return;
        await fetch(`/api/admin/reserved-usernames?id=${id}`, { method: "DELETE" });
        load();
    }

    return (
        <div className="min-h-screen p-6 text-white" style={{ background: "#050818" }}>
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <AtSign className="w-6 h-6" style={{ color: "#00CEC8" }} />
                        <h1 className="text-2xl font-black">Zaxira usernamelar</h1>
                        <span className="text-sm px-2 py-0.5 rounded-lg" style={{ background: "rgba(43,62,232,0.15)", color: "rgba(140,160,210,0.85)" }}>
                            Jami: {total}
                        </span>
                    </div>
                    <button onClick={() => setAddOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Plus className="w-4 h-4" /> Yangi qo&apos;shish
                    </button>
                </div>

                {/* Toifa filtri + hisoblar */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <button onClick={() => { setCategory(""); setPage(1); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: !category ? "rgba(43,62,232,0.30)" : "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.25)" }}>
                        Hammasi
                    </button>
                    {CATEGORIES.map(c => (
                        <button key={c.key} onClick={() => { setCategory(c.key); setPage(1); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                            style={{
                                background: category === c.key ? `${c.color}25` : "rgba(11,18,40,0.60)",
                                border: `1px solid ${category === c.key ? c.color : "rgba(43,62,232,0.20)"}`,
                            }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                            {c.label}
                            <span className="opacity-60">({counts[c.key] ?? 0})</span>
                        </button>
                    ))}
                </div>

                {/* Qidiruv */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(120,140,190,0.65)" }} />
                    <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
                        placeholder="Username qidirish..."
                        className="w-full h-11 rounded-xl pl-10 pr-3 text-sm outline-none"
                        style={{ background: "rgba(11,18,40,0.70)", border: "1px solid rgba(43,62,232,0.25)", caretColor: "#00CEC8" }} />
                </div>

                {/* Jadval */}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 text-white/50">Hech narsa topilmadi</div>
                ) : (
                    <div className="space-y-1">
                        {items.map(it => {
                            const cat = CATEGORIES.find(c => c.key === it.category);
                            return (
                                <div key={it.id} className="flex items-center gap-3 p-3 rounded-xl"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    <span className="font-black text-base">@{it.username}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold"
                                        style={{ background: `${cat?.color ?? "#666"}25`, color: cat?.color ?? "#999" }}>
                                        {cat?.label ?? it.category}
                                    </span>
                                    {it.priceUzs != null && (
                                        <span className="text-xs" style={{ color: "#F59E0B" }}>
                                            {it.priceUzs.toLocaleString("uz-UZ")} UZS
                                        </span>
                                    )}
                                    {it.note && <span className="text-xs text-white/60 truncate">{it.note}</span>}
                                    {it.assignedToId && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,206,200,0.15)", color: "#00CEC8" }}>Ajratilgan</span>}
                                    <button onClick={() => remove(it.id, it.username)}
                                        className="ml-auto p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {total > 50 && (
                    <div className="flex items-center justify-between mt-6">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                            style={{ background: "rgba(43,62,232,0.20)", border: "1px solid rgba(43,62,232,0.25)" }}>
                            ← Oldingi
                        </button>
                        <span className="text-sm text-white/60">
                            {page} / {Math.ceil(total / 50)}
                        </span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                            style={{ background: "rgba(43,62,232,0.20)", border: "1px solid rgba(43,62,232,0.25)" }}>
                            Keyingi →
                        </button>
                    </div>
                )}

                {addOpen && <AddModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); }} />}
            </div>
        </div>
    );
}

function AddModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [usernames, setUsernames] = useState("");
    const [category, setCategory] = useState("PERSONAL");
    const [note, setNote] = useState("");
    const [priceUzs, setPriceUzs] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ added: number; skipped: number; total: number } | null>(null);

    async function save() {
        if (!usernames.trim() || busy) return;
        setBusy(true);
        try {
            const res = await fetch("/api/admin/reserved-usernames", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usernames, category, note: note || null,
                    priceUzs: priceUzs ? parseInt(priceUzs, 10) : null,
                }),
            });
            const d = await res.json();
            if (res.ok) { setResult(d); setTimeout(onDone, 1500); }
            else alert(d.error || "Xato");
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl p-6" onClick={e => e.stopPropagation()}
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black">Yangi zaxira usernamelar</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-white/70" /></button>
                </div>

                {result ? (
                    <div className="text-center py-8">
                        <div className="text-3xl font-black mb-2" style={{ color: "#00CEC8" }}>{result.added} qo&apos;shildi</div>
                        <div className="text-sm text-white/60">{result.skipped} takror o&apos;tkazildi ({result.total} ta jami)</div>
                    </div>
                ) : (
                    <>
                        <label className="block text-xs font-bold mb-1 text-white/70">Toifa</label>
                        <select value={category} onChange={e => setCategory(e.target.value)}
                            className="w-full h-11 rounded-xl px-3 mb-4 text-sm"
                            style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.25)", color: "white" }}>
                            {CATEGORIES.map(c => <option key={c.key} value={c.key} style={{ background: "#0B1228" }}>{c.label}</option>)}
                        </select>

                        <label className="block text-xs font-bold mb-1 text-white/70">Usernamelar (probel, vergul yoki qator bilan ajrating)</label>
                        <textarea value={usernames} onChange={e => setUsernames(e.target.value)}
                            rows={5} placeholder="@ali, @sara, jamshid, dilshod..."
                            className="w-full rounded-xl p-3 mb-4 text-sm outline-none font-mono"
                            style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.25)", color: "white", caretColor: "#00CEC8" }} />

                        <label className="block text-xs font-bold mb-1 text-white/70">Izoh (ixtiyoriy)</label>
                        <input value={note} onChange={e => setNote(e.target.value)}
                            placeholder="Masalan: Do'stim Jalol"
                            className="w-full h-11 rounded-xl px-3 mb-4 text-sm outline-none"
                            style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.25)", color: "white", caretColor: "#00CEC8" }} />

                        {category === "VIP" && (
                            <>
                                <label className="block text-xs font-bold mb-1 text-white/70">Narx (UZS, faqat VIP uchun)</label>
                                <input value={priceUzs} onChange={e => setPriceUzs(e.target.value.replace(/[^0-9]/g, ""))}
                                    placeholder="Masalan: 5000000"
                                    className="w-full h-11 rounded-xl px-3 mb-4 text-sm outline-none tabular-nums"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.25)", color: "white", caretColor: "#00CEC8" }} />
                            </>
                        )}

                        <button onClick={save} disabled={!usernames.trim() || busy}
                            className="w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Saqlash</>}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
