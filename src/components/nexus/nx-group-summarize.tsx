"use client";

// AI xulosa modali — oxirgi N xabarni Gemini bilan xulosa qiladi.
// Foydalanuvchi 500 ta o'qilmagan xabar bilan qaytganda 3 gapli qisqartma oladi.

import { useState } from "react";
import { X, Loader2, Sparkles, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

const COUNT_OPTIONS = [30, 50, 100, 200];

export function NxGroupSummarize({
    open, channelId, onClose,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
}) {
    const [count, setCount] = useState(50);
    const [busy, setBusy] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [msgCount, setMsgCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const run = async () => {
        setBusy(true); setError(null); setSummary(null);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/summarize?count=${count}`, { method: "POST" });
            if (r.ok) {
                const d = await r.json();
                setSummary(d.summary);
                setMsgCount(d.messageCount);
            } else {
                const d = await r.json().catch(() => ({}));
                setError(d.error || "AI xato");
            }
        } finally { setBusy(false); }
    };

    if (!open) return null;
    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto z-[321] max-h-[85vh] flex flex-col overflow-hidden rounded-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4" style={{ color: "#00CEC8" }} /> AI xulosa
                    </h3>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.7)" }}>
                        Oxirgi nechta xabar
                    </p>
                    <div className="flex gap-1.5 mb-4">
                        {COUNT_OPTIONS.map(c => (
                            <button key={c} onClick={() => setCount(c)} disabled={busy}
                                className="flex-1 py-2 rounded-xl text-xs font-bold transition"
                                style={count === c
                                    ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white" }
                                    : { background: "rgba(11,18,40,0.55)", color: "rgba(200,215,245,0.85)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                {c}
                            </button>
                        ))}
                    </div>

                    {!summary && !error && (
                        <button onClick={run} disabled={busy}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> AI o&apos;qiyapti...</> : <><Sparkles className="w-4 h-4" /> Xulosa qilish</>}
                        </button>
                    )}

                    {error && (
                        <p className="text-sm text-center py-3" style={{ color: "#FF505A" }}>{error}</p>
                    )}

                    {summary && (
                        <>
                            <div className="p-4 rounded-2xl mt-2"
                                style={{ background: "rgba(0,206,200,0.06)", border: "1px solid rgba(0,206,200,0.22)" }}>
                                <p className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1" style={{ color: "#00CEC8" }}>
                                    <Sparkles className="w-3 h-3" /> Xulosa · {msgCount} xabar
                                </p>
                                <p className="text-sm whitespace-pre-wrap" style={{ color: "rgba(220,230,255,0.95)" }}>
                                    {summary}
                                </p>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => summary && copyToClipboard(summary)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)", color: "white" }}>
                                    <Copy className="w-4 h-4" /> Nusxa
                                </button>
                                <button onClick={run} disabled={busy}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Qayta"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
