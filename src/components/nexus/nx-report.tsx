"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Flag, ChevronRight, Check, ShieldAlert, ChevronLeft,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type ReportCategory =
    | "spam"
    | "hate"
    | "harassment"
    | "violence"
    | "misinformation"
    | "copyright"
    | "adult"
    | "other";

type ReportStep = "category" | "detail" | "sent";

interface MyReport {
    id: string;
    target: string;
    category: ReportCategory;
    sentAt: string;
    status: "reviewing" | "resolved" | "dismissed";
}

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES: { id: ReportCategory; label: string; description: string }[] = [
    { id: "spam",          label: "Spam",                  description: "Keraksiz yoki takroriy kontent" },
    { id: "hate",          label: "Nafrat nutqi",           description: "Irq, din, jins bo'yicha kamsitish" },
    { id: "harassment",    label: "Ta'qib va zo'ravonlik",  description: "Shaxsga yo'naltirilgan hujum" },
    { id: "violence",      label: "Zo'ravonlik tasviri",    description: "Jiddiy jismoniy zarar" },
    { id: "misinformation",label: "Noto'g'ri ma'lumot",    description: "Yolg'on yoki chalg'ituvchi kontent" },
    { id: "copyright",     label: "Mualliflik huquqi",      description: "Ruxsatsiz kontent ishlatish" },
    { id: "adult",         label: "18+ kontent",            description: "Voyaga etmagan foydalanuvchilar uchun" },
    { id: "other",         label: "Boshqa sabab",           description: "Yuqoridagilarga to'g'ri kelmaydigan" },
];

const MY_REPORTS: MyReport[] = [
    { id: "rp1", target: "Video: 'Clickbait sarlavha'",  category: "misinformation", sentAt: "3 kun oldin",   status: "reviewing" },
    { id: "rp2", target: "Foydalanuvchi: @spam_bot_uz",  category: "spam",           sentAt: "1 hafta oldin", status: "resolved"  },
    { id: "rp3", target: "Izoh: haqoratli so'z",          category: "harassment",     sentAt: "2 hafta oldin", status: "dismissed" },
];

const STATUS_STYLE = {
    reviewing: { label: "Ko'rib chiqilmoqda", color: "#EAB308",  bg: "rgba(234,179,8,0.15)"  },
    resolved:  { label: "Hal qilindi",        color: "#10B981",  bg: "rgba(16,185,129,0.15)" },
    dismissed: { label: "Rad etildi",         color: "#94A3B8",  bg: "rgba(148,163,184,0.12)"},
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// NxReport
// ─────────────────────────────────────────────────────────────────────────────
export function NxReport() {
    const { reportOpen, setReportOpen } = useNxPlayer();

    const [tab,           setTab]           = useState<"send" | "history">("send");
    const [step,          setStep]          = useState<ReportStep>("category");
    const [selectedCat,   setSelectedCat]   = useState<ReportCategory | null>(null);
    const [detail,        setDetail]        = useState("");
    const [myReports,     setMyReports]     = useState<MyReport[]>(MY_REPORTS);

    if (!reportOpen) return null;

    const reset = () => { setStep("category"); setSelectedCat(null); setDetail(""); };

    const submit = () => {
        if (!selectedCat) return;
        const r: MyReport = {
            id: `rp_${Date.now()}`,
            target: "Joriy kontent",
            category: selectedCat,
            sentAt: "Hozir",
            status: "reviewing",
        };
        setMyReports(prev => [r, ...prev]);
        setStep("sent");
    };

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                {step !== "category" && tab === "send"
                    ? <button onClick={() => step === "detail" ? setStep("category") : reset()}
                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    : <button onClick={() => { setReportOpen(false); reset(); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-5 h-5 text-white" />
                    </button>
                }
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Shikoyat</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>Buzilishni xabar qiling</p>
                </div>
                <ShieldAlert className="w-5 h-5" style={{ color: "#EF4444" }} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
                {(["send", "history"] as const).map(t => (
                    <button key={t} onClick={() => { setTab(t); reset(); }}
                        className="flex-1 py-2 text-[12px] font-black rounded-xl transition-all"
                        style={{
                            background: tab === t ? "rgba(43,62,232,0.25)" : "transparent",
                            color: tab === t ? "white" : "rgba(100,120,170,0.60)",
                            border: `1px solid ${tab === t ? "rgba(43,62,232,0.45)" : "transparent"}`,
                        }}>
                        {t === "send" ? "Shikoyat yuborish" : "Tarixim"}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-10" style={{ scrollbarWidth: "none" }}>

                {/* ── SEND tab ── */}
                {tab === "send" && (
                    <>
                        {/* Step: category */}
                        {step === "category" && (
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                    style={{ color: "rgba(100,120,170,0.60)" }}>
                                    Sabab tanlang
                                </p>
                                {CATEGORIES.map(c => (
                                    <button key={c.id}
                                        onClick={() => { setSelectedCat(c.id); setStep("detail"); }}
                                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                                        style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                        <div className="flex-1">
                                            <p className="text-[12px] font-bold text-white">{c.label}</p>
                                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>{c.description}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(100,120,170,0.40)" }} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step: detail */}
                        {step === "detail" && selectedCat && (
                            <div className="flex flex-col gap-4">
                                <div className="p-3 rounded-2xl"
                                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
                                    <p className="text-[11px] font-black text-white">
                                        {CATEGORIES.find(c => c.id === selectedCat)?.label}
                                    </p>
                                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(140,160,210,0.70)" }}>
                                        {CATEGORIES.find(c => c.id === selectedCat)?.description}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                        style={{ color: "rgba(100,120,170,0.60)" }}>
                                        Qo'shimcha ma'lumot (ixtiyoriy)
                                    </p>
                                    <textarea
                                        value={detail}
                                        onChange={e => setDetail(e.target.value)}
                                        rows={5}
                                        placeholder="Muammoni batafsil tushuntiring..."
                                        className="w-full bg-transparent text-sm text-white outline-none px-3 py-3 rounded-xl resize-none"
                                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}
                                    />
                                </div>

                                <div className="p-3 rounded-2xl"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <p className="text-[10px] leading-relaxed" style={{ color: "rgba(120,140,190,0.70)" }}>
                                        Moderatorlarimiz 24 soat ichida ko'rib chiqadi. Anonim bo'ladi —
                                        shikoyatingiz kim ekanligingiz aytilmaydi.
                                    </p>
                                </div>

                                <button onClick={submit}
                                    className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}>
                                    <Flag className="w-4 h-4" />
                                    Shikoyat yuborish
                                </button>
                            </div>
                        )}

                        {/* Step: sent */}
                        {step === "sent" && (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                    style={{ background: "rgba(16,185,129,0.18)", border: "2px solid rgba(16,185,129,0.40)" }}>
                                    <Check className="w-8 h-8" style={{ color: "#10B981" }} />
                                </div>
                                <p className="text-base font-black text-white mb-1">Shikoyat yuborildi</p>
                                <p className="text-[11px] text-center mb-6" style={{ color: "rgba(140,160,210,0.75)" }}>
                                    Moderatorlar 24 soat ichida ko'rib chiqadi
                                </p>
                                <button onClick={() => { reset(); setTab("history"); }}
                                    className="px-5 py-2.5 rounded-xl text-sm font-black text-white"
                                    style={{ background: "rgba(43,62,232,0.22)", border: "1px solid rgba(43,62,232,0.35)" }}>
                                    Tarixni ko'rish
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ── HISTORY tab ── */}
                {tab === "history" && (
                    <div className="flex flex-col gap-3">
                        {myReports.length === 0 && (
                            <p className="text-center py-16 text-sm" style={{ color: "rgba(100,120,170,0.40)" }}>
                                Hali shikoyatlar yo'q
                            </p>
                        )}
                        {myReports.map(r => {
                            const s = STATUS_STYLE[r.status];
                            const cat = CATEGORIES.find(c => c.id === r.category);
                            return (
                                <div key={r.id} className="p-4 rounded-2xl"
                                    style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#EF4444" }} />
                                        <span className="text-[11px] font-bold text-white flex-1 truncate">{r.target}</span>
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                                            style={{ background: s.bg, color: s.color }}>
                                            {s.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                                            style={{ background: "rgba(239,68,68,0.12)", color: "rgba(239,68,68,0.80)" }}>
                                            {cat?.label}
                                        </span>
                                        <span className="text-[9px] ml-auto" style={{ color: "rgba(100,120,170,0.50)" }}>
                                            {r.sentAt}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
