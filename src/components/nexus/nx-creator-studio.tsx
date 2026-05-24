"use client";

import { useState, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Upload, Play, Music, BookOpen, Mic, Radio,
    FileText, Image as ImageIcon, Tag, DollarSign,
    Globe, Lock, Check, ChevronRight, Loader2, LogIn, BarChart2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Kontent turlari
// ─────────────────────────────────────────────────────────────────────────────
const CONTENT_TYPES = [
    { id: "video",   icon: Play,     label: "Video",      desc: "MP4, MOV, AVI · max 10GB",  color: "#2B3EE8" },
    { id: "short",   icon: Radio,    label: "Short",      desc: "Vertikal · max 60 soniya",   color: "#8B5CF6" },
    { id: "music",   icon: Music,    label: "Musiqa",     desc: "WAV, FLAC, MP3 · Lossless",  color: "#10B981" },
    { id: "podcast", icon: Mic,      label: "Podkast",    desc: "MP3, AAC · epizod",          color: "#F59E0B" },
    { id: "book",    icon: BookOpen, label: "Kitob",      desc: "EPUB, PDF · elektron kitob", color: "#EF4444" },
] as const;

type ContentTypeId = typeof CONTENT_TYPES[number]["id"];

type UploadState = "idle" | "uploading" | "processing" | "done";

// ─────────────────────────────────────────────────────────────────────────────
// NxCreatorStudio — kontent yuklash modal
// ─────────────────────────────────────────────────────────────────────────────
export function NxCreatorStudio() {
    const { studioOpen, setStudioOpen, setAnalyticsOpen } = useNxPlayer();
    const { status } = useSession();
    const [step,       setStep]       = useState<1 | 2 | 3>(1);
    const [typeId,     setTypeId]     = useState<ContentTypeId>("video");
    const [uploadState, setUploadState] = useState<UploadState>("idle");
    const [uploadPct,  setUploadPct]  = useState(0);
    const [title,      setTitle]      = useState("");
    const [desc,       setDesc]       = useState("");
    const [tags,       setTags]       = useState("");
    const [price,      setPrice]      = useState("0");
    const [privacy,    setPrivacy]    = useState<"public"|"private">("public");
    const [category,   setCategory]  = useState("Texnologiya");
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const chosenType = CONTENT_TYPES.find(t => t.id === typeId)!;

    const resetAll = () => {
        setStep(1); setUploadState("idle"); setUploadPct(0);
        setTitle(""); setDesc(""); setTags(""); setPrice("0");
        setPrivacy("public"); setCategory("Texnologiya");
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleClose = () => { setStudioOpen(false); resetAll(); };

    /* Mock yuklash simulatsiyasi */
    const startUpload = () => {
        setStep(3); setUploadState("uploading"); setUploadPct(0);
        timerRef.current = setInterval(() => {
            setUploadPct(p => {
                if (p >= 100) {
                    clearInterval(timerRef.current!);
                    setUploadState("processing");
                    setTimeout(() => setUploadState("done"), 2000);
                    return 100;
                }
                return p + Math.random() * 8 + 2;
            });
        }, 200);
    };

    if (!studioOpen) return null;

    /* ── Auth gate ─────────────────────────────────────────────────────── */
    if (status === "unauthenticated") {
        return (
            <>
                <div
                    className="fixed inset-0 z-50"
                    style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }}
                    onClick={handleClose}
                />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="relative w-full max-w-sm flex flex-col items-center rounded-3xl overflow-hidden p-8 text-center"
                        style={{
                            background: "rgba(8,12,32,0.98)",
                            border: "1px solid rgba(43,62,232,0.25)",
                            boxShadow: "0 32px 80px rgba(0,0,0,0.60)",
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}
                        >
                            <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                        </button>
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                        >
                            <LogIn className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-lg font-black text-white mb-2">Kirish talab etiladi</h2>
                        <p className="text-sm mb-6" style={{ color: "rgba(140,160,210,0.80)" }}>
                            Creator Studio foydalanish uchun Humo hisobingizga kiring
                        </p>
                        <button
                            onClick={() => signIn()}
                            className="w-full py-3 rounded-xl text-sm font-black text-white transition-all duration-200"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 0 20px rgba(43,62,232,0.35)" }}
                        >
                            Kirish
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50"
                style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ pointerEvents: "none" }}
            >
                <div
                    className="relative w-full max-w-lg flex flex-col rounded-3xl overflow-hidden"
                    style={{
                        background: "rgba(8,12,32,0.98)",
                        border: "1px solid rgba(43,62,232,0.25)",
                        boxShadow: "0 32px 80px rgba(0,0,0,0.60), inset 0 1px 0 rgba(43,62,232,0.15)",
                        maxHeight: "90vh",
                        pointerEvents: "auto",
                    }}
                >
                    {/* ── Header ──────────────────────────────────── */}
                    <div
                        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}
                    >
                        <div>
                            <h2 className="text-base font-black text-white">Creator Studio</h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className="flex items-center gap-1.5">
                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-200"
                                            style={{
                                                background: step >= s ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.12)",
                                                color: step >= s ? "#fff" : "rgba(100,120,170,0.60)",
                                            }}
                                        >
                                            {step > s ? <Check className="w-2.5 h-2.5" /> : s}
                                        </div>
                                        {s < 3 && (
                                            <div className="w-8 h-0.5 rounded-full" style={{
                                                background: step > s ? "linear-gradient(90deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.15)"
                                            }} />
                                        )}
                                    </div>
                                ))}
                                <span className="text-[10px] ml-1" style={{ color: "rgba(100,120,170,0.60)" }}>
                                    {step === 1 ? "Tur tanlash" : step === 2 ? "Ma'lumot" : "Yuklash"}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}
                        >
                            <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                        </button>
                    </div>

                    {/* ── Bosqich 1: Tur tanlash ───────────────────── */}
                    {step === 1 && (
                        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: "none" }}>
                            {/* Analytics shortcut */}
                            <button
                                onClick={() => { handleClose(); setAnalyticsOpen(true); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 transition-all duration-150 active:scale-95"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}
                            >
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <BarChart2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-xs font-black text-white">Analitika</p>
                                    <p className="text-[10px]" style={{ color: "rgba(120,140,190,0.75)" }}>Ko'rishlar, daromad va statistika</p>
                                </div>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.50)" }} />
                            </button>
                            <p className="text-xs mb-4" style={{ color: "rgba(140,160,210,0.80)" }}>
                                Qanday kontent yaratmoqchisiz?
                            </p>
                            <div className="flex flex-col gap-2">
                                {CONTENT_TYPES.map(type => {
                                    const active = typeId === type.id;
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => setTypeId(type.id)}
                                            className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-150"
                                            style={{
                                                background: active ? `${type.color}18` : "rgba(43,62,232,0.05)",
                                                border: `1px solid ${active ? type.color + "50" : "rgba(43,62,232,0.14)"}`,
                                            }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ background: active ? type.color : `${type.color}20` }}
                                            >
                                                <type.icon className="w-5 h-5" style={{ color: active ? "#fff" : type.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-white">{type.label}</p>
                                                <p className="text-[10px] mt-0.5" style={{ color: "rgba(120,140,190,0.70)" }}>{type.desc}</p>
                                            </div>
                                            {active && <Check className="w-4 h-4 flex-shrink-0" style={{ color: type.color }} />}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full mt-4 py-3 rounded-2xl text-sm font-black text-white transition-all duration-150 active:scale-98"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                            >
                                Davom etish
                                <ChevronRight className="inline w-4 h-4 ml-1" />
                            </button>
                        </div>
                    )}

                    {/* ── Bosqich 2: Ma'lumot ──────────────────────── */}
                    {step === 2 && (
                        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: "none" }}>
                            {/* Yuklash zonasi */}
                            <div
                                className="flex flex-col items-center justify-center py-8 rounded-2xl mb-4 cursor-pointer transition-all duration-150 hover:border-blue-500/40"
                                style={{
                                    border: "2px dashed rgba(43,62,232,0.30)",
                                    background: "rgba(43,62,232,0.04)",
                                }}
                            >
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                                    style={{ background: `${chosenType.color}20` }}
                                >
                                    <Upload className="w-6 h-6" style={{ color: chosenType.color }} />
                                </div>
                                <p className="text-sm font-bold text-white mb-1">
                                    {chosenType.label} faylini tanlang
                                </p>
                                <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>
                                    {chosenType.desc}
                                </p>
                            </div>

                            {/* Sarlavha */}
                            <StudioField icon={FileText} label="Sarlavha" placeholder="Kontent sarlavhasi...">
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Kontent sarlavhasi..."
                                    className="flex-1 bg-transparent text-sm text-white outline-none"
                                    style={{ caretColor: "#00CEC8" }}
                                />
                            </StudioField>

                            {/* Tavsif */}
                            <div
                                className="rounded-xl px-3.5 py-3 mb-3"
                                style={{ background: "rgba(43,62,232,0.07)", border: "1px solid rgba(43,62,232,0.16)" }}
                            >
                                <p className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(43,62,232,0.55)" }}>Tavsif</p>
                                <textarea
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    placeholder="Kontent haqida qisqacha ma'lumot..."
                                    rows={3}
                                    className="w-full bg-transparent text-sm text-white outline-none resize-none"
                                    style={{ caretColor: "#00CEC8", color: "rgba(180,195,235,0.90)" }}
                                />
                            </div>

                            {/* Teglar */}
                            <StudioField icon={Tag} label="Teglar" placeholder="#nexus #humo #kontent">
                                <input
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    placeholder="#nexus #humo #kontent"
                                    className="flex-1 bg-transparent text-sm text-white outline-none"
                                    style={{ caretColor: "#00CEC8" }}
                                />
                            </StudioField>

                            {/* Kategoriya */}
                            <StudioField icon={ImageIcon} label="Kategoriya" placeholder="">
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="flex-1 bg-transparent text-sm outline-none"
                                    style={{ color: "rgba(180,195,235,0.90)", cursor: "pointer" }}
                                >
                                    {["Texnologiya","Musiqa","Kino","Sport","O'yin","Ta'lim","Ko'ngilochar"].map(c => (
                                        <option key={c} value={c} style={{ background: "#0B1228" }}>{c}</option>
                                    ))}
                                </select>
                            </StudioField>

                            {/* Narx */}
                            <StudioField icon={DollarSign} label="Narx (0 = bepul)" placeholder="0">
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    min="0"
                                    placeholder="0"
                                    className="flex-1 bg-transparent text-sm text-white outline-none"
                                    style={{ caretColor: "#00CEC8" }}
                                />
                                <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>UZS</span>
                            </StudioField>

                            {/* Maxfiylik */}
                            <div className="flex items-center gap-2 mb-4">
                                {(["public","private"] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPrivacy(p)}
                                        className="flex items-center gap-2 flex-1 py-2.5 px-3 rounded-xl transition-all duration-150"
                                        style={{
                                            background: privacy === p ? "rgba(43,62,232,0.15)" : "rgba(43,62,232,0.05)",
                                            border: `1px solid ${privacy === p ? "rgba(43,62,232,0.35)" : "rgba(43,62,232,0.12)"}`,
                                        }}
                                    >
                                        {p === "public"
                                            ? <Globe  className="w-4 h-4" style={{ color: privacy === p ? "#00CEC8" : "rgba(100,120,170,0.60)" }} />
                                            : <Lock   className="w-4 h-4" style={{ color: privacy === p ? "#00CEC8" : "rgba(100,120,170,0.60)" }} />}
                                        <span className="text-xs font-bold" style={{ color: privacy === p ? "rgba(220,230,255,0.95)" : "rgba(120,140,190,0.70)" }}>
                                            {p === "public" ? "Hammaga ochiq" : "Faqat men"}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-150"
                                    style={{ background: "rgba(43,62,232,0.10)", color: "rgba(160,176,224,0.80)", border: "1px solid rgba(43,62,232,0.18)" }}
                                >
                                    Orqaga
                                </button>
                                <button
                                    onClick={startUpload}
                                    className="flex-1 py-3 rounded-2xl text-sm font-black text-white transition-all duration-150 active:scale-98"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                                >
                                    Yuklash
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Bosqich 3: Yuklash jarayoni ─────────────── */}
                    {step === 3 && (
                        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10" style={{ scrollbarWidth: "none" }}>
                            {uploadState === "done" ? (
                                /* Muvaffaqiyat */
                                <>
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                        style={{ background: "linear-gradient(135deg,#10B981,#00CEC8)", boxShadow: "0 0 32px rgba(16,185,129,0.40)" }}
                                    >
                                        <Check className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-1">Muvaffaqiyatli yuklandi!</h3>
                                    <p className="text-sm text-center mb-6" style={{ color: "rgba(140,160,210,0.80)" }}>
                                        Kontentingiz tekshirilmoqda. Ko'p o'tmay efirga chiqadi.
                                    </p>
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={resetAll}
                                            className="flex-1 py-3 rounded-2xl text-sm font-bold"
                                            style={{ background: "rgba(43,62,232,0.10)", color: "rgba(160,176,224,0.80)", border: "1px solid rgba(43,62,232,0.18)" }}
                                        >
                                            Yangi kontent
                                        </button>
                                        <button
                                            onClick={handleClose}
                                            className="flex-1 py-3 rounded-2xl text-sm font-black text-white"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                                        >
                                            Yopish
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* Yuklanmoqda */
                                <>
                                    <div className="relative w-20 h-20 mb-6">
                                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(43,62,232,0.15)" strokeWidth="6" />
                                            <circle
                                                cx="40" cy="40" r="34" fill="none"
                                                stroke="url(#grad)" strokeWidth="6"
                                                strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 34}`}
                                                strokeDashoffset={`${2 * Math.PI * 34 * (1 - Math.min(uploadPct, 100) / 100)}`}
                                                style={{ transition: "stroke-dashoffset 0.2s ease" }}
                                            />
                                            <defs>
                                                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="#2B3EE8" />
                                                    <stop offset="100%" stopColor="#00CEC8" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {uploadState === "processing"
                                                ? <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#00CEC8" }} />
                                                : <span className="text-base font-black text-white">{Math.round(Math.min(uploadPct, 100))}%</span>}
                                        </div>
                                    </div>

                                    <h3 className="text-base font-black text-white mb-1">
                                        {uploadState === "uploading" ? "Yuklanmoqda..." : "Qayta ishlanmoqda..."}
                                    </h3>
                                    <p className="text-sm text-center" style={{ color: "rgba(140,160,210,0.70)" }}>
                                        {uploadState === "uploading"
                                            ? `${title || chosenType.label} · ${chosenType.desc}`
                                            : "Video siqilmoqda, thumbnail yaratilmoqda..."}
                                    </p>

                                    <div
                                        className="w-full mt-6 h-1.5 rounded-full overflow-hidden"
                                        style={{ background: "rgba(43,62,232,0.15)" }}
                                    >
                                        <div
                                            className="h-full rounded-full transition-all duration-200"
                                            style={{
                                                width: `${uploadState === "processing" ? 100 : uploadPct}%`,
                                                background: "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                                animation: uploadState === "processing" ? "pulse 1.5s ease-in-out infinite" : "none",
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchi — maydon
// ─────────────────────────────────────────────────────────────────────────────
function StudioField({
    icon: Icon, label, placeholder: _placeholder, children,
}: {
    icon: React.ElementType; label: string; placeholder: string; children: React.ReactNode;
}) {
    return (
        <div
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 mb-3"
            style={{ background: "rgba(43,62,232,0.07)", border: "1px solid rgba(43,62,232,0.16)" }}
        >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.55)" }} />
            <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-[9px] font-black uppercase tracking-widest flex-shrink-0 w-14" style={{ color: "rgba(43,62,232,0.55)" }}>{label}</span>
                {children}
            </div>
        </div>
    );
}
