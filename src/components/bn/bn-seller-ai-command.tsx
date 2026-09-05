"use client";

// AI tabiiy tilda buyruq bar — sotuvchi o'zbek tilida yozadi, tizim bajaradi.
//   "eng kam sotilgan 10 ta mahsulotga 20% chegirma qo'y"
//   "sotilmagan mahsulotlarga 15% chegirma"

import { useState } from "react";
import { Wand2, Send, Loader2, Check, X, AlertTriangle } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Props {
    onDone?: () => void;   // muvaffaqiyatli bajarilgach reload
}

interface AiResp {
    ok?: boolean;
    type?: "done" | "needs_confirm" | "explain" | "unknown" | "empty";
    message?: string;
    error?: string;
    plannedAction?: {
        type: string; target?: string; limit?: number; pct?: number; message: string;
    };
}

const EXAMPLES = [
    "Eng kam sotilgan 10 ta mahsulotga 20% chegirma qo'y",
    "Sotilmagan mahsulotlarga 15% chegirma",
    "Barcha chegirmalarni bekor qil",
];

export function BnSellerAiCommand({ onDone }: Props) {
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [resp, setResp] = useState<AiResp | null>(null);
    const [pendingConfirm, setPendingConfirm] = useState<AiResp | null>(null);

    const submit = async (confirm = false) => {
        if (!text.trim() || busy) return;
        setBusy(true); setResp(null); setPendingConfirm(null);
        try {
            const r = await fetch("/api/bn/seller/ai-command", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text.trim(), confirm }),
            });
            const j: AiResp = await r.json();
            if (j.type === "needs_confirm") {
                setPendingConfirm(j);
            } else {
                setResp(j);
                if (j.type === "done") {
                    setText("");
                    if (onDone) onDone();
                }
            }
        } catch {
            setResp({ error: "network_error", message: "Tarmoq xatosi" });
        } finally {
            setBusy(false);
        }
    };

    const confirmAndRun = () => submit(true);

    return (
        <div className="rounded-2xl p-4 sm:p-5 mb-5"
            style={{
                background: `linear-gradient(135deg, ${BN.info}22 0%, ${BN.surface} 60%)`,
                border: `1px solid ${BN.border}`,
            }}>
            <div className="flex items-start gap-3 mb-3">
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.info, color: "#fff" }}>
                    <Wand2 className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-black">AI ga aytishingiz mumkin</p>
                    <p className="text-[12px]" style={{ color: BN.text2 }}>
                        O'zbekcha yozing — men bajaraman. Ommaviy chegirma, chegirmani olib tashlash va boshqalar.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
                <input value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submit(); }}
                    placeholder="Masalan: eng kam sotilgan 5 ta mahsulotga 20% chegirma qo'y"
                    disabled={busy}
                    className="flex-1 h-11 px-3 rounded-xl text-[13px]"
                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }} />
                <button onClick={() => submit()} disabled={busy || !text.trim()}
                    className="h-11 px-4 rounded-xl text-[13px] font-black inline-flex items-center gap-1.5 disabled:opacity-40 hover:brightness-95"
                    style={{ background: BN.gold, color: BN.onGold }}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Bajarish
                </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => setText(ex)} disabled={busy}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-bold hover:brightness-95 disabled:opacity-40"
                        style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}>
                        {ex}
                    </button>
                ))}
            </div>

            {pendingConfirm && pendingConfirm.plannedAction && (
                <div className="mt-3 p-3 rounded-xl flex items-start gap-3"
                    style={{ background: BN.warnSoft, border: `1px solid ${BN.warn}` }}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: BN.warn }} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black" style={{ color: BN.warn }}>Tasdiqlash kerak</p>
                        <p className="text-[12.5px] mt-0.5" style={{ color: BN.text }}>
                            {pendingConfirm.plannedAction.message}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => setPendingConfirm(null)}
                            className="w-9 h-9 rounded-lg grid place-items-center hover:brightness-95"
                            style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}>
                            <X className="w-4 h-4" />
                        </button>
                        <button onClick={confirmAndRun}
                            className="h-9 px-3 rounded-lg text-[12px] font-black inline-flex items-center gap-1 hover:brightness-95"
                            style={{ background: BN.warn, color: "#fff" }}>
                            <Check className="w-3.5 h-3.5" /> Ha, bajar
                        </button>
                    </div>
                </div>
            )}

            {resp && resp.message && (
                <div className="mt-3 p-3 rounded-xl flex items-start gap-2"
                    style={{
                        background: resp.type === "done" ? BN.okSoft : resp.error ? BN.errSoft : BN.surfaceUp,
                        border: `1px solid ${resp.type === "done" ? BN.ok : resp.error ? BN.err : BN.border}`,
                    }}>
                    {resp.type === "done" && <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BN.ok }} />}
                    {resp.error && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BN.err }} />}
                    <p className="text-[13px] font-bold" style={{ color: resp.type === "done" ? BN.ok : resp.error ? BN.err : BN.text }}>
                        {resp.message}
                    </p>
                </div>
            )}
        </div>
    );
}
