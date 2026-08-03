"use client";

// AI moderation bloki modali — foydalanuvchi bloklanganda ekranga chiqadi.
// Foydalanuvchi so'rovi: "vaqtinchalik ogohlantiruvchi block holatga tushiramiz...
// Adolatsiz deb hisoblasangiz Ariza tugmasi bilan asoschiga murojaat qiling."

import { useState, useEffect } from "react";
import { ShieldAlert, Clock, Send, Loader2, X, CheckCircle2 } from "lucide-react";

export interface BanInfo {
    banId: string;
    reason: string;
    level: number;
    expiresAt: string | null;   // ISO string; null = abadiy
    contextSnippet?: string | null;
    category?: "hard" | "soft";
}

interface Props {
    ban: BanInfo | null;
    onClose: () => void;
}

const REASON_LABELS: Record<string, string> = {
    hate_speech: "Nafrat / kamsitish",
    hate: "Nafrat / kamsitish",
    violence: "Zo'ravonlik yoki tahdid",
    threat: "Tahdid",
    scam: "Firibgarlik / aldov",
    spam: "Spam / takroriy reklama",
    adult: "Voyaga yetmaganlarga nomaqbul kontent",
    illegal: "Noqonuniy tovar/xizmat",
    csam: "Bola ekspluatatsiyasi (jiddiy)",
    terrorism: "Terrorizm tashviqoti",
    child_exploitation: "Bola ekspluatatsiyasi",
    murder_planning: "O'ldirish rejasi",
    other: "Qoidalarga zid kontent",
};

function fmtRemaining(expiresAt: string | null): { text: string; done: boolean } {
    if (!expiresAt) return { text: "Abadiy", done: false };
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return { text: "Muddati tugadi", done: true };
    const s = Math.floor(ms / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (days >= 1) return { text: `${days} kun ${hours} soat`, done: false };
    if (hours >= 1) return { text: `${hours} soat ${mins} daq`, done: false };
    if (mins >= 1) return { text: `${mins} daq ${secs} son`, done: false };
    return { text: `${secs} son`, done: false };
}

export function NxBanModal({ ban, onClose }: Props) {
    const [remaining, setRemaining] = useState(fmtRemaining(ban?.expiresAt ?? null));
    const [showAppeal, setShowAppeal] = useState(false);
    const [appealText, setAppealText] = useState("");
    const [sending, setSending] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [alreadyAppealed, setAlreadyAppealed] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Countdown har 1 sekundda yangilanadi
    useEffect(() => {
        if (!ban) return;
        const iv = setInterval(() => setRemaining(fmtRemaining(ban.expiresAt ?? null)), 1000);
        return () => clearInterval(iv);
    }, [ban]);

    if (!ban) return null;

    const reasonLabel = REASON_LABELS[ban.reason] || ban.reason;
    const isForever = ban.expiresAt === null;
    const isHard = ban.category === "hard";

    async function submitAppeal() {
        if (sending) return;
        const clean = appealText.trim();
        if (clean.length < 20) { setErr("Ariza matni kamida 20 harf bo'lishi kerak"); return; }
        setSending(true); setErr(null);
        try {
            const res = await fetch("/api/user/ban-appeal", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ banId: ban!.banId, text: clean }),
            });
            const d = await res.json();
            if (!res.ok) {
                if (d.error?.includes("allaqachon yuborilgan")) setAlreadyAppealed(true);
                else setErr(d.error || "Xato");
                return;
            }
            setSubmitted(true);
        } finally { setSending(false); }
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(12px)" }}>
            <div className="w-full max-w-md rounded-3xl overflow-hidden"
                style={{ background: "rgba(11,16,40,0.98)", border: "1px solid rgba(239,68,68,0.30)", boxShadow: "0 24px 64px rgba(0,0,0,0.70)" }}>

                {/* Header */}
                <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.30)" }}>
                        <ShieldAlert className="w-6 h-6" style={{ color: "#EF4444" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-white">Vaqtincha bloklandingiz</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(140,160,210,0.85)" }}>AI xavfsizlik tizimi topgan qoidabuzarlik</p>
                    </div>
                    {!isForever && !isHard && (
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Sabab */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>Sabab</p>
                        <p className="text-sm font-bold text-white">{reasonLabel}</p>
                        {isHard && (
                            <p className="text-[11px] mt-2 px-3 py-2 rounded-lg" style={{ color: "#EF4444", background: "rgba(239,68,68,0.10)" }}>
                                Bu kategoriya jiddiy — o'zbekiston qonunchiligiga zid.
                            </p>
                        )}
                    </div>

                    {/* Muddat */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>Qolgan vaqt</p>
                        <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
                            <Clock className="w-4 h-4" style={{ color: "#EF4444" }} />
                            <span className="text-base font-black text-white tabular-nums flex-1">{remaining.text}</span>
                        </div>
                        {ban.expiresAt && (
                            <p className="text-[10px] mt-1.5 px-1" style={{ color: "rgba(140,160,210,0.60)" }}>
                                Ozod bo'lish vaqti: {new Date(ban.expiresAt).toLocaleString("uz-UZ")}
                            </p>
                        )}
                    </div>

                    {/* Ariza qismi */}
                    {submitted ? (
                        <div className="flex flex-col items-center py-4 gap-2">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(0,206,200,0.12)", border: "1px solid rgba(0,206,200,0.35)" }}>
                                <CheckCircle2 className="w-7 h-7" style={{ color: "#00CEC8" }} />
                            </div>
                            <p className="text-sm font-black text-white text-center">Ariza yuborildi</p>
                            <p className="text-xs text-center max-w-xs" style={{ color: "rgba(140,160,210,0.80)" }}>
                                Asoschi qisqa vaqt ichida ko'rib chiqadi. Adolatli bo'lsa blok bekor qilinadi.
                            </p>
                        </div>
                    ) : alreadyAppealed ? (
                        <div className="px-3.5 py-3 rounded-xl text-xs" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B" }}>
                            Bu blok uchun ariza allaqachon yuborilgan. Asoschi javob berguncha kuting.
                        </div>
                    ) : showAppeal ? (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>Ariza matni</p>
                            <p className="text-[11px] mb-2" style={{ color: "rgba(140,160,210,0.70)" }}>
                                Nima uchun bu blok adolatsiz? Konkret tushuntirib bering (kamida 20 harf).
                            </p>
                            <textarea value={appealText} onChange={e => { setAppealText(e.target.value.slice(0, 2000)); setErr(null); }}
                                placeholder="Masalan: Bu xabar yaqin do'stimga hazil edi..."
                                rows={4} maxLength={2000}
                                className="w-full px-3.5 py-3 rounded-xl text-sm text-white outline-none resize-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                            <div className="flex items-center justify-between mt-1 px-1">
                                <span className="text-[10px]" style={{ color: err ? "#EF4444" : "rgba(140,160,210,0.60)" }}>
                                    {err || `${appealText.length}/2000`}
                                </span>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => setShowAppeal(false)} disabled={sending}
                                    className="flex-1 px-4 py-3 rounded-xl text-xs font-bold disabled:opacity-50"
                                    style={{ background: "rgba(43,62,232,0.10)", color: "rgba(200,215,245,0.85)" }}>
                                    Bekor
                                </button>
                                <button onClick={submitAppeal} disabled={sending || appealText.trim().length < 20}
                                    className="flex-1 px-4 py-3 rounded-xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    Yuborish
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <button onClick={() => setShowAppeal(true)}
                                className="w-full px-4 py-3 rounded-xl text-xs font-black text-white active:scale-[0.98] transition"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                Adolatsiz deb hisoblayman — ariza yuborish
                            </button>
                            <p className="text-[10px] mt-2 text-center" style={{ color: "rgba(140,160,210,0.60)" }}>
                                Asoschi shaxsan ko'rib chiqadi
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer eslatma */}
                <div className="px-6 py-3 flex items-start gap-2" style={{ background: "rgba(43,62,232,0.04)", borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                    <p className="text-[10px] leading-relaxed" style={{ color: "rgba(140,160,210,0.70)" }}>
                        For Humo hech kimning maxfiy suhbatini o'qimaydi. Faqat AI tekshiradi va qoidabuzarlikda blok qo'yadi.
                        Ma'lumot to'planmaydi, sotilmaydi.
                    </p>
                </div>
            </div>
        </div>
    );
}
