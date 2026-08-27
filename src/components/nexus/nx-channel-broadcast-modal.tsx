"use client";

// Kanal Broadcast — owner uchun urgent e'lon. Muted a'zolar ham push oladi.
// Rate-limit: 3/24s (server tekshiradi).

import { useEffect, useState } from "react";
import { X, Loader2, Megaphone, AlertTriangle, Check } from "lucide-react";

type Status = { used: number; remaining: number; memberCount: number };

export function NxChannelBroadcastModal({
    open, channelId, channelName, onClose, onSent,
}: {
    open: boolean;
    channelId: string;
    channelName: string;
    onClose: () => void;
    onSent: () => void;
}) {
    const [text, setText] = useState("");
    const [status, setStatus] = useState<Status | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmStage, setConfirmStage] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!open) return;
        setText(""); setConfirmStage(false); setDone(false);
        fetch(`/api/nexus/channels/${channelId}/broadcast`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setStatus({ used: d.used, remaining: d.remaining, memberCount: d.memberCount }); })
            .catch(() => {});
    }, [open, channelId]);

    async function send() {
        if (!text.trim() || busy) return;
        setBusy(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/broadcast`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text.trim() }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) {
                setDone(true);
                setTimeout(() => { onSent(); onClose(); }, 1500);
            } else {
                alert(d?.error ?? "Yuborilmadi");
                setConfirmStage(false);
            }
        } finally {
            setBusy(false);
        }
    }

    if (!open) return null;

    const remaining = status?.remaining ?? 3;
    const canSend = remaining > 0 && text.trim().length > 0;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-0 md:mx-auto md:max-w-md z-[321] rounded-3xl overflow-hidden"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Megaphone className="w-4 h-4" style={{ color: "#F5B301" }} /> Muhim e&apos;lon
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {done ? (
                        <div className="flex flex-col items-center py-6">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                                style={{ background: "rgba(0,206,200,0.14)" }}>
                                <Check className="w-7 h-7" style={{ color: "#00CEC8" }} />
                            </div>
                            <p className="text-sm font-black text-white">E&apos;lon yuborildi</p>
                            <p className="text-xs mt-1" style={{ color: "rgba(160,176,224,0.7)" }}>
                                Barcha a&apos;zolar push xabar oldi
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="p-3 rounded-xl flex items-start gap-2"
                                style={{ background: "rgba(245,179,1,0.08)", border: "1px solid rgba(245,179,1,0.30)" }}>
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F5B301" }} />
                                <p className="text-[11px] leading-snug" style={{ color: "rgba(230,220,180,0.95)" }}>
                                    Broadcast e&apos;loni <b>mute qilgan a&apos;zolarga ham</b> push xabar yuboradi.
                                    Faqat haqiqatan muhim xabarlar uchun ishlating.
                                </p>
                            </div>

                            <div>
                                <label className="text-[11px] font-black uppercase tracking-widest mb-1.5 block"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    E&apos;lon matni
                                </label>
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value.slice(0, 2000))}
                                    rows={5}
                                    placeholder="Muhim xabarni yozing..."
                                    className="w-full rounded-xl p-3 text-sm resize-none focus:outline-none"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }}
                                />
                                <div className="mt-1 flex items-center justify-between text-[10px]"
                                    style={{ color: "rgba(140,160,210,0.7)" }}>
                                    <span>{text.length}/2000</span>
                                    {status && <span>Bugun qolgan: <b style={{ color: remaining > 0 ? "#00CEC8" : "#EF4444" }}>{remaining}/3</b></span>}
                                </div>
                            </div>

                            {status && (
                                <div className="p-3 rounded-xl text-xs"
                                    style={{ background: "rgba(11,18,40,0.50)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    <p className="text-white">
                                        <b>{status.memberCount}</b> a&apos;zoga push yuboriladi
                                    </p>
                                    <p className="mt-1" style={{ color: "rgba(160,176,224,0.7)" }}>
                                        Kanal: <b style={{ color: "#00CEC8" }}>{channelName}</b>
                                    </p>
                                </div>
                            )}

                            {confirmStage ? (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setConfirmStage(false)} disabled={busy}
                                        className="flex-1 h-11 rounded-full font-black text-sm disabled:opacity-50"
                                        style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                                        Bekor
                                    </button>
                                    <button onClick={send} disabled={busy}
                                        className="flex-1 h-11 rounded-full font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        style={{ background: "#F5B301", color: "#050818" }}>
                                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `HAQIQATAN yuborilsin`}
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setConfirmStage(true)} disabled={!canSend}
                                    className="w-full h-11 rounded-full font-black text-sm disabled:opacity-50"
                                    style={{ background: canSend ? "linear-gradient(135deg, #F5B301, #F97316)" : "rgba(43,62,232,0.20)", color: canSend ? "#050818" : "white" }}>
                                    {remaining <= 0 ? "Kunlik limit tugadi" : "Yuborishga tayyorlash"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
