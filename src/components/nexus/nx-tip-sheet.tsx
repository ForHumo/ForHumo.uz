"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { Gift, X, Loader2, Check, Wallet, Heart } from "lucide-react";
import type { TipTarget } from "@/lib/nexus-tip";
import { formatMoney, currencySymbol, type Currency } from "@/lib/money";

// ─────────────────────────────────────────────────────────────────────────────
// NxTipSheet — ijodkorni real pul bilan qo'llab-quvvatlash (tip / donat).
// targetType: PROFILE / POST / VIDEO / LIVE. Super Chat (LIVE) live-room'da alohida.
// ─────────────────────────────────────────────────────────────────────────────
function presetsFor(c: Currency) { return c === "USD" ? [1, 5, 10, 50, 100] : [5000, 10000, 50000, 100000, 500000]; }

export function NxTipSheet({
    open, onClose, recipientUsername, recipientName, targetType, targetId, onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    recipientUsername: string;
    recipientName?: string | null;
    targetType: TipTarget;
    targetId?: string | null;
    onSuccess?: (amount: number) => void;
}) {
    const [currency, setCurrency] = useState<Currency>("UZS");
    const [amount, setAmount] = useState<number>(0);
    const [custom, setCustom] = useState("");
    const [message, setMessage] = useState("");
    const [balance, setBalance] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (open) {
            setCustom(""); setMessage(""); setError(null); setDone(false);
            fetch("/api/pay/wallet").then(r => r.json()).then(d => {
                const c: Currency = d.currency === "USD" ? "USD" : "UZS";
                setCurrency(c); setBalance(Number(d.balance ?? 0));
                setAmount(presetsFor(c)[1]);
            }).catch(() => setBalance(null));
        }
    }, [open]);

    if (!open) return null;

    const PRESETS = presetsFor(currency);
    const effective = custom ? Math.max(0, Math.round(Number(custom) || 0)) : amount;
    const insufficient = balance !== null && effective > balance;

    async function send() {
        if (busy || effective < 1) return;
        setBusy(true); setError(null);
        try {
            const res = await fetch("/api/nexus/tip", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipientUsername, amount: effective, targetType, targetId: targetId ?? null, message: message.trim() || null }),
            });
            const d = await res.json();
            if (!res.ok) { setError(d.error || "Xatolik"); return; }
            setDone(true);
            onSuccess?.(effective);
            setTimeout(() => { onClose(); }, 1400);
        } catch {
            setError("Tarmoq xatosi, qayta urinib ko'ring");
        } finally { setBusy(false); }
    }

    const displayName = recipientName || `@${recipientUsername}`;

    return (
        <>
            <div className="fixed inset-0 z-[80]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl overflow-hidden md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(245,158,11,0.30)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
                onClick={e => e.stopPropagation()}>

                {done ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)" }}>
                            <Check className="w-8 h-8" style={{ color: "#F59E0B" }} />
                        </div>
                        <p className="text-lg font-black text-white">{formatMoney(effective, currency)} yuborildi!</p>
                        <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: "rgba(180,200,240,0.8)" }}>
                            <Heart className="w-3.5 h-3.5" style={{ color: "#EF4444" }} /> {displayName} qo&apos;llab-quvvatlandi
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.14)" }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
                                <Gift className="w-5 h-5" style={{ color: "#F59E0B" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-black text-white truncate">Qo&apos;llab-quvvatlash</h3>
                                <p className="text-[11px] truncate" style={{ color: "rgba(120,140,185,0.8)" }}>{displayName}ni qo&apos;llab-quvvatlang</p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        <div className="px-5 py-4">
                            {/* Preset summalar */}
                            <div className="grid grid-cols-5 gap-2">
                                {PRESETS.map(p => {
                                    const active = !custom && amount === p;
                                    return (
                                        <button key={p} onClick={() => { setAmount(p); setCustom(""); }}
                                            className="py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95"
                                            style={active
                                                ? { background: "linear-gradient(135deg,#F59E0B,#EF4444)", color: "#fff", boxShadow: "0 4px 16px rgba(245,158,11,0.35)" }
                                                : { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", color: "rgba(245,200,120,0.95)" }}>
                                            {formatMoney(p, currency)}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Maxsus summa */}
                            <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(245,158,11,0.20)" }}>
                                <span className="text-sm font-black" style={{ color: "#F59E0B" }}>{currencySymbol(currency)}</span>
                                <input type="number" inputMode="numeric" value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
                                    placeholder="Maxsus summa"
                                    className="flex-1 bg-transparent text-white text-base font-bold outline-none" style={{ caretColor: "#F59E0B" }} />
                            </div>

                            {/* Xabar (ixtiyoriy) */}
                            <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 200))}
                                placeholder="Xabar qoldiring (ixtiyoriy)" rows={2}
                                className="mt-3 w-full px-3 py-2.5 rounded-xl bg-transparent text-white text-sm outline-none resize-none"
                                style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }} />

                            {/* Balans */}
                            {balance !== null && (
                                <div className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(120,140,185,0.85)" }}>
                                    <Wallet className="w-3.5 h-3.5" /> Hamyon: <span className="font-bold text-white">{formatMoney(balance, currency)}</span>
                                </div>
                            )}

                            {error && <p className="mt-2 text-xs font-bold" style={{ color: "#EF4444" }}>{error}</p>}

                            {/* Yuborish / to'ldirish */}
                            {insufficient ? (
                                <Link href="/pay" onClick={onClose}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Wallet className="w-4 h-4" /> Hamyonni to&apos;ldirish
                                </Link>
                            ) : (
                                <button onClick={send} disabled={busy || effective < 1}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-50 active:scale-[0.99] transition"
                                    style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)", boxShadow: "0 6px 24px rgba(245,158,11,0.35)" }}>
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                                    {formatMoney(effective, currency)} yuborish
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
