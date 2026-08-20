"use client";

// BN admin — Web Push broadcast composer. Faqat OWNER.
// Jalol xabar tayyorlaydi, segment tanlaydi, PREVIEW ko'radi, yuboradi.
// Rate limit: kuniga 3 broadcast. Har broadcast tamaddi bo'lgach counter kamayadi.

import { useEffect, useState } from "react";
import { Radio, Send, Loader2, AlertTriangle, Users, Store, ShoppingBag } from "lucide-react";
import { BN } from "@/lib/bn-theme";

type Segment = "all" | "sellers" | "buyers";

interface SegState {
    all: number; sellers: number; buyers: number;
}

export function BnAdminBroadcast() {
    const [seg, setSeg] = useState<Segment>("all");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [segments, setSegments] = useState<SegState | null>(null);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [confirming, setConfirming] = useState(false);

    async function reload() {
        try {
            const r = await fetch("/api/bn/admin/push/broadcast");
            if (!r.ok) return;
            const d = await r.json();
            setSegments(d.segments);
            setRemaining(d.rateLimit?.remaining ?? null);
        } catch { /* ignore */ }
    }
    useEffect(() => { void reload(); }, []);

    const count = segments ? segments[seg] : 0;
    const canSend = title.trim().length >= 3 && body.trim().length >= 5 && count > 0 && !busy && (remaining ?? 0) > 0;

    async function send() {
        setBusy(true); setMsg(null);
        try {
            const r = await fetch("/api/bn/admin/push/broadcast", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || undefined, segment: seg }),
            });
            const d = await r.json();
            if (!r.ok) {
                setMsg(d?.error === "too_many_broadcasts"
                    ? "Kunlik limitga yetdingiz (3/24 soat). Ertaga urinib ko'ring."
                    : d?.error === "no_recipients"
                    ? "Bu segmentda hech kim yo'q — push obunachisi topilmadi."
                    : `Xatolik: ${d?.error ?? "no'malum"}`);
                return;
            }
            setMsg(`Yuborildi: ${d.recipients} foydalanuvchiga (${d.tookMs}ms).`);
            setTitle(""); setBody(""); setUrl("");
            setConfirming(false);
            void reload();
        } catch (e) {
            setMsg(`Xatolik: ${String(e)}`);
        } finally { setBusy(false); }
    }

    return (
        <div className="max-w-[720px] space-y-4">
            <div className="p-4 rounded-2xl"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                <div className="flex items-center gap-2 mb-2">
                    <Radio className="w-4 h-4" style={{ color: BN.gold }} />
                    <h3 className="text-[15px] font-black">Push broadcast</h3>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>
                    Barcha yoki tanlangan foydalanuvchilarga bir vaqtda Web Push xabari yuboriladi.
                    Kuniga <b>3 marta</b> mumkin. Spam qilmang — foydalanuvchilar push'ni o'chirib qo'yishi mumkin.
                </p>
                {remaining !== null && (
                    <p className="text-[11.5px] mt-2" style={{ color: remaining === 0 ? BN.err : BN.text3 }}>
                        Bugun qolgan: <b>{remaining}/3</b>
                    </p>
                )}
            </div>

            {/* Segment tanlash */}
            <div className="grid grid-cols-3 gap-2">
                {(["all", "sellers", "buyers"] as Segment[]).map(k => {
                    const active = seg === k;
                    const label = k === "all" ? "Hammasi" : k === "sellers" ? "Sotuvchilar" : "Xaridorlar";
                    const Icon = k === "all" ? Users : k === "sellers" ? Store : ShoppingBag;
                    const n = segments ? segments[k] : 0;
                    return (
                        <button key={k} onClick={() => setSeg(k)}
                            className="p-3 rounded-xl flex flex-col items-center gap-1 transition-transform active:scale-[0.98]"
                            style={{
                                background: active ? BN.goldSoft : BN.surface,
                                border: `1px solid ${active ? BN.gold : BN.border}`,
                            }}>
                            <Icon className="w-4 h-4" style={{ color: active ? BN.gold : BN.text3 }} />
                            <span className="text-[12px] font-black">{label}</span>
                            <span className="text-[13px] font-black tabular-nums" style={{ color: BN.gold }}>{n}</span>
                        </button>
                    );
                })}
            </div>

            {/* Forma */}
            <div className="p-4 rounded-2xl space-y-3"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <label className="block">
                    <span className="text-[11.5px] font-bold" style={{ color: BN.text3 }}>Sarlavha (max 60)</span>
                    <input type="text" value={title} maxLength={60}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Masalan: Yangi bozor ochildi!"
                        className="w-full mt-1 h-10 px-3 rounded-lg text-[13px] font-bold outline-none"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }} />
                </label>
                <label className="block">
                    <span className="text-[11.5px] font-bold" style={{ color: BN.text3 }}>Matn (max 200)</span>
                    <textarea value={body} maxLength={200} rows={3}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Chorsu bozorining barcha do'konlari BN'da paydo bo'ldi. Hoziroq ko'ring."
                        className="w-full mt-1 px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }} />
                </label>
                <label className="block">
                    <span className="text-[11.5px] font-bold" style={{ color: BN.text3 }}>URL (ixtiyoriy — bosilganda ochiladi)</span>
                    <input type="url" value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://bozornarxida.uz/m/chorsu"
                        className="w-full mt-1 h-10 px-3 rounded-lg text-[12px] outline-none"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }} />
                </label>
            </div>

            {/* Preview */}
            {(title || body) && (
                <div className="p-4 rounded-2xl"
                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}>
                    <p className="text-[10.5px] font-black uppercase tracking-wider mb-2" style={{ color: BN.text3 }}>
                        Ko'rinishi
                    </p>
                    <div className="p-3 rounded-lg"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                        <p className="text-[13px] font-black">{title || "(sarlavha)"}</p>
                        <p className="text-[12px] mt-1 leading-relaxed" style={{ color: BN.text2 }}>
                            {body || "(matn)"}
                        </p>
                        {url && (
                            <p className="text-[10.5px] mt-1 truncate" style={{ color: BN.text3 }}>{url}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Yuborish */}
            <div className="flex items-center gap-2">
                {!confirming ? (
                    <button onClick={() => setConfirming(true)} disabled={!canSend}
                        className="h-11 px-5 rounded-xl text-[13.5px] font-black flex items-center gap-2 disabled:opacity-40"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        <Send className="w-4 h-4" />
                        Yuborish uchun tayyorlash ({count})
                    </button>
                ) : (
                    <>
                        <button onClick={send} disabled={busy}
                            className="h-11 px-5 rounded-xl text-[13.5px] font-black flex items-center gap-2 disabled:opacity-40"
                            style={{ background: BN.err, color: "#fff" }}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                            HAQIQATAN {count} kishiga yuborish
                        </button>
                        <button onClick={() => setConfirming(false)} disabled={busy}
                            className="h-11 px-4 rounded-xl text-[13px] font-bold"
                            style={{ background: "transparent", color: BN.text3 }}>
                            Bekor
                        </button>
                    </>
                )}
            </div>

            {msg && (
                <p className="text-[12.5px] px-3 py-2 rounded-lg"
                    style={{
                        background: msg.startsWith("Yuborildi") ? `${BN.ok}22` : `${BN.err}22`,
                        color: msg.startsWith("Yuborildi") ? BN.ok : BN.err,
                    }}>
                    {msg}
                </p>
            )}
        </div>
    );
}
