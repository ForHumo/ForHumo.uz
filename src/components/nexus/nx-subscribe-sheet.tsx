"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { Star, X, Loader2, Check, Wallet, Lock, Sparkles } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/money";

// ─────────────────────────────────────────────────────────────────────────────
// NxSubscribeSheet — ijodkorga pullik oylik obuna (real pul). 30 kunlik kirish.
// ─────────────────────────────────────────────────────────────────────────────
export function NxSubscribeSheet({
    open, onClose, creatorUsername, creatorName, price, currency, alreadyActive, onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    creatorUsername: string;
    creatorName?: string | null;
    price: number;
    currency: Currency;
    alreadyActive?: boolean;
    onSuccess?: (expiresAt: string) => void;
}) {
    const [balance, setBalance] = useState<number | null>(null);
    const [myCurrency, setMyCurrency] = useState<Currency>("UZS");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (open) {
            setError(null); setDone(false);
            fetch("/api/pay/wallet").then(r => r.json()).then(d => {
                setBalance(Number(d.balance ?? 0));
                setMyCurrency(d.currency === "USD" ? "USD" : "UZS");
            }).catch(() => setBalance(null));
        }
    }, [open]);

    if (!open) return null;

    // Tomoshabin valyutasi narx valyutasi bilan bir xil bo'lsa — yetishmovchilikni oldindan tekshiramiz
    const insufficient = balance !== null && myCurrency === currency && price > balance;
    const displayName = creatorName || `@${creatorUsername}`;

    async function subscribe() {
        if (busy) return;
        setBusy(true); setError(null);
        try {
            const res = await fetch("/api/nexus/subscribe", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creatorUsername }),
            });
            const d = await res.json();
            if (!res.ok) { setError(d.error || "Xatolik"); return; }
            setDone(true);
            onSuccess?.(d.expiresAt);
            setTimeout(onClose, 1500);
        } catch {
            setError("Tarmoq xatosi");
        } finally { setBusy(false); }
    }

    return (
        <>
            <div className="fixed inset-0 z-[80]" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl overflow-hidden md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(139,92,246,0.30)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
                onClick={e => e.stopPropagation()}>

                {done ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
                            <Check className="w-8 h-8" style={{ color: "#8B5CF6" }} />
                        </div>
                        <p className="text-lg font-black text-white">{alreadyActive ? "Obuna uzaytirildi!" : "Obuna bo'ldingiz!"}</p>
                        <p className="text-sm mt-1" style={{ color: "rgba(180,200,240,0.8)" }}>{displayName}ning maxsus kontenti ochildi</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(139,92,246,0.14)" }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)" }}>
                                <Star className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-black text-white truncate">{alreadyActive ? "Obunani uzaytirish" : "Pullik obuna"}</h3>
                                <p className="text-[11px] truncate" style={{ color: "rgba(120,140,185,0.8)" }}>{displayName}</p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        <div className="px-5 py-4">
                            {/* Narx */}
                            <div className="flex items-baseline justify-center gap-1.5 py-2">
                                <span className="text-3xl font-black" style={{ color: "#8B5CF6" }}>{formatMoney(price, currency)}</span>
                                <span className="text-sm font-bold" style={{ color: "rgba(120,140,185,0.8)" }}>/ oy</span>
                            </div>

                            {/* Imtiyozlar */}
                            <div className="mt-2 space-y-2">
                                {[
                                    "Faqat obunachilarga maxsus postlar",
                                    "Ijodkorni to'g'ridan-to'g'ri qo'llab-quvvatlash",
                                    "30 kunlik kirish (qo'lda uzaytiriladi)",
                                ].map((b, i) => (
                                    <div key={i} className="flex items-center gap-2.5 text-[13px]" style={{ color: "rgba(200,215,245,0.9)" }}>
                                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#8B5CF6" }} />{b}
                                    </div>
                                ))}
                            </div>

                            {balance !== null && (
                                <div className="mt-4 flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(120,140,185,0.85)" }}>
                                    <Wallet className="w-3.5 h-3.5" /> Hamyon: <span className="font-bold text-white">{formatMoney(balance, myCurrency)}</span>
                                </div>
                            )}
                            {error && <p className="mt-2 text-xs font-bold" style={{ color: "#EF4444" }}>{error}</p>}

                            {insufficient ? (
                                <Link href="/pay" onClick={onClose}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Wallet className="w-4 h-4" /> Hamyonni to&apos;ldirish
                                </Link>
                            ) : (
                                <button onClick={subscribe} disabled={busy}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white disabled:opacity-50 active:scale-[0.99] transition"
                                    style={{ background: "linear-gradient(135deg,#8B5CF6,#2B3EE8)", boxShadow: "0 6px 24px rgba(139,92,246,0.35)" }}>
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    {formatMoney(price, currency)} — {alreadyActive ? "Uzaytirish" : "Obuna bo'lish"}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
