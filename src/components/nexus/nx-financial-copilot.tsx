"use client";

// Humo Financial Copilot — chuqur AI moliyaviy yordamchi.
// Foydalanuvchining o'z Wallet + kirim/chiqim ma'lumotini tahlil qilib
// PRIVATE tavsiya + PUBLIC (chatga yuborish uchun) javob beradi.

import { useState } from "react";
import { X, Loader2, Sparkles, Send, Copy, ShieldCheck, TrendingUp } from "lucide-react";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

const SCAN_DEPTHS = [20, 40, 80, 200];

export function NxFinancialCopilot({
    open, contextType, contextId, onClose, onSendPublic,
}: {
    open: boolean;
    contextType: "dm" | "channel";
    contextId: string;
    onClose: () => void;
    onSendPublic?: (text: string) => void;
}) {
    const [question, setQuestion] = useState("");
    const [scanDepth, setScanDepth] = useState(40);
    const [busy, setBusy] = useState(false);
    const [priv, setPriv] = useState<string | null>(null);
    const [pub, setPub] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<{ balance: number; currency: string; dailyBudgetSafeToSpend: number; daysLeftInMonth: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async () => {
        setBusy(true); setError(null); setPriv(null); setPub(null);
        try {
            const r = await fetch(`/api/nexus/copilot/financial`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ context: contextType, contextId, question, scanDepth }),
            });
            if (r.ok) {
                const d = await r.json();
                setPriv(d.private);
                setPub(d.public);
                setSnapshot(d.snapshot);
            } else {
                const d = await r.json().catch(() => ({}));
                setError(d.error || "AI xato");
            }
        } finally { setBusy(false); }
    };

    if (!open) return null;

    const currencyLabel = snapshot?.currency === "USD" ? "$" : "so'm";
    const formatMoney = (n: number) => `${Math.round(n).toLocaleString("uz-UZ")} ${currencyLabel}`;

    return (
        <>
            <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto z-[401] max-h-[90vh] flex flex-col overflow-hidden rounded-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4" style={{ color: "#00CEC8" }} /> Financial Copilot
                        </h3>
                        <p className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: "rgba(140,160,210,0.7)" }}>
                            <ShieldCheck className="w-3 h-3" /> Faqat sizning ma&apos;lumotlaringiz o&apos;qiladi
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto space-y-4" style={{ scrollbarWidth: "none" }}>
                    {!priv && !error && (
                        <>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    Sizning savolingiz (ixtiyoriy)
                                </p>
                                <textarea value={question} onChange={e => setQuestion(e.target.value)}
                                    rows={2} maxLength={500}
                                    placeholder="Masalan: '200k qarz berishga arziydimi?' yoki bo'sh qoldiring — AI o'zi topadi"
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)" }} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.7)" }}>
                                    Chatdan qancha xabar o&apos;qilsin
                                </p>
                                <div className="flex gap-1.5">
                                    {SCAN_DEPTHS.map(d => (
                                        <button key={d} onClick={() => setScanDepth(d)} disabled={busy}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold"
                                            style={scanDepth === d
                                                ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white" }
                                                : { background: "rgba(11,18,40,0.55)", color: "rgba(200,215,245,0.85)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={run} disabled={busy}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> AI tahlil qilyapti...</>
                                    : <><Sparkles className="w-4 h-4" /> Tavsiya olish</>}
                            </button>
                            <p className="text-[10px] text-center" style={{ color: "rgba(140,160,210,0.6)" }}>
                                AI faqat sizning hamyoningiz + so&apos;nggi 60 kun kirim/chiqimni ko&apos;radi.
                                Suhbatdoshingizning ma&apos;lumoti hech qachon o&apos;qilmaydi.
                            </p>
                        </>
                    )}

                    {error && (
                        <p className="text-sm text-center py-3" style={{ color: "#FF505A" }}>{error}</p>
                    )}

                    {priv && snapshot && (
                        <>
                            {/* Snapshot cards */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-2xl" style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.25)" }}>
                                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.7)" }}>Balans</p>
                                    <p className="text-sm font-black text-white">{formatMoney(snapshot.balance)}</p>
                                </div>
                                <div className="p-3 rounded-2xl" style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.7)" }}>Kunlik xavfsiz</p>
                                    <p className="text-sm font-black text-white">{formatMoney(snapshot.dailyBudgetSafeToSpend)}</p>
                                </div>
                            </div>

                            {/* Private */}
                            <div className="p-4 rounded-2xl"
                                style={{ background: "rgba(0,206,200,0.06)", border: "1px solid rgba(0,206,200,0.22)" }}>
                                <p className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1" style={{ color: "#00CEC8" }}>
                                    <TrendingUp className="w-3 h-3" /> Faqat siz uchun (sirli)
                                </p>
                                <p className="text-sm whitespace-pre-wrap" style={{ color: "rgba(220,230,255,0.95)" }}>
                                    {priv}
                                </p>
                            </div>

                            {/* Public */}
                            {pub && (
                                <div className="p-4 rounded-2xl"
                                    style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.22)" }}>
                                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(180,195,235,0.85)" }}>
                                        Chatga yuborish uchun (raqamlarsiz)
                                    </p>
                                    <p className="text-sm mb-3" style={{ color: "rgba(220,230,255,0.95)" }}>
                                        {pub}
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={() => copyToClipboard(pub)}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)", color: "white" }}>
                                            <Copy className="w-3.5 h-3.5" /> Nusxa
                                        </button>
                                        {onSendPublic && (
                                            <button onClick={() => { onSendPublic(pub); onClose(); }}
                                                className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                                <Send className="w-3.5 h-3.5" /> Chatga yuborish
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button onClick={() => { setPriv(null); setPub(null); setSnapshot(null); }}
                                className="w-full py-2 rounded-xl text-xs"
                                style={{ background: "rgba(43,62,232,0.08)", color: "rgba(180,195,235,0.85)" }}>
                                Yangi savol
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
