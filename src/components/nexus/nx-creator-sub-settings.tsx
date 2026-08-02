"use client";

import { useState, useEffect } from "react";
import { Settings2, X, Loader2, Check, Users, Coins } from "lucide-react";
import { formatMoney, currencySymbol, type Currency } from "@/lib/money";

// ─────────────────────────────────────────────────────────────────────────────
// NxCreatorSubSettings — ijodkor o'z pullik obuna narxini sozlaydi (0 = o'chiq).
// ─────────────────────────────────────────────────────────────────────────────
function presetsFor(c: Currency) { return c === "USD" ? [0, 1, 5, 10, 50] : [0, 10000, 30000, 50000, 100000]; }

export function NxCreatorSubSettings({
    initialPrice, onClose, onSaved,
}: {
    initialPrice: number;
    onClose: () => void;
    onSaved: (price: number) => void;
}) {
    const [currency, setCurrency] = useState<Currency>("UZS");
    const [price, setPrice] = useState(initialPrice);
    const [custom, setCustom] = useState("");
    const [busy, setBusy] = useState(false);
    const [stats, setStats] = useState<{ activeSubscribers: number; monthlyIncome: number } | null>(null);
    const PRESETS = presetsFor(currency);

    useEffect(() => {
        fetch("/api/nexus/creator").then(r => r.json())
            .then(d => {
                const c: Currency = d.currency === "USD" ? "USD" : "UZS";
                setCurrency(c);
                setStats({ activeSubscribers: d.activeSubscribers ?? 0, monthlyIncome: d.monthlyIncome ?? 0 });
                if (!presetsFor(c).includes(initialPrice)) setCustom(String(initialPrice || ""));
            })
            .catch(() => { });
    }, [initialPrice]);

    const effective = custom !== "" ? Math.max(0, Math.round(Number(custom) || 0)) : price;

    async function save() {
        if (busy) return;
        setBusy(true);
        try {
            const res = await fetch("/api/nexus/creator", {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subPrice: effective }),
            });
            const d = await res.json();
            if (res.ok) { onSaved(d.subPrice); onClose(); }
        } finally { setBusy(false); }
    }

    return (
        <>
            <div className="fixed inset-0 z-[80]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl overflow-hidden md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(139,92,246,0.30)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(139,92,246,0.14)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)" }}>
                        <Settings2 className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-white">Pullik obuna</h3>
                        <p className="text-[11px]" style={{ color: "rgba(120,140,185,0.8)" }}>Oylik narxni belgilang (0 = o&apos;chiq)</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="px-5 py-4">
                    {/* Statistika */}
                    {stats && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}>
                                <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: "rgba(120,140,185,0.8)" }}><Users className="w-3 h-3" />Obunachilar</p>
                                <p className="text-lg font-black text-white mt-0.5">{stats.activeSubscribers}</p>
                            </div>
                            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}>
                                <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: "rgba(120,140,185,0.8)" }}><Coins className="w-3 h-3" />Oylik daromad</p>
                                <p className="text-base font-black mt-0.5" style={{ color: "#8B5CF6" }}>{formatMoney(stats.monthlyIncome, currency)}</p>
                            </div>
                        </div>
                    )}

                    {/* Preset narxlar */}
                    <div className="grid grid-cols-5 gap-2">
                        {PRESETS.map(p => {
                            const active = custom === "" && price === p;
                            return (
                                <button key={p} onClick={() => { setPrice(p); setCustom(""); }}
                                    className="py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95"
                                    style={active
                                        ? { background: "linear-gradient(135deg,#8B5CF6,#2B3EE8)", color: "#fff" }
                                        : { background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.22)", color: "rgba(196,181,253,0.95)" }}>
                                    {p === 0 ? "O'chiq" : formatMoney(p, currency)}
                                </button>
                            );
                        })}
                    </div>

                    {/* Maxsus narx */}
                    <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(139,92,246,0.20)" }}>
                        <span className="text-sm font-black" style={{ color: "#8B5CF6" }}>{currencySymbol(currency)}</span>
                        <input type="number" inputMode="numeric" value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="Maxsus oylik narx" className="flex-1 bg-transparent text-white text-base font-bold outline-none" style={{ caretColor: "#8B5CF6" }} />
                    </div>

                    <button onClick={save} disabled={busy}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-50 active:scale-[0.99] transition"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#2B3EE8)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {effective > 0 ? `${formatMoney(effective, currency)}/oy — Saqlash` : "O'chirib saqlash"}
                    </button>
                </div>
            </div>
        </>
    );
}
