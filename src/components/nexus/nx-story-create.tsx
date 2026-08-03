"use client";

// Stories Creator v2 — Instagram-quality multi-slide editor.
// Xususiyatlar: multi-slide (2-10), TEXT/IMAGE/VIDEO, filter, music, text overlay.
// Kelasi iteratsiyalarda: drawing canvas, stickers, reorder.

import { useState, useRef, useEffect } from "react";
import { upload } from "@vercel/blob/client";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, ImagePlus, Loader2, Send, Trash2, Plus, Type, Music,
    Sparkles, Palette, ChevronLeft, ChevronRight,
} from "lucide-react";

const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);

// Filter presetlari (nx-stories-viewer bilan mos)
const FILTERS = [
    { key: "none", label: "Original" },
    { key: "grayscale", label: "Kul rang" },
    { key: "sepia", label: "Sepiya" },
    { key: "warm", label: "Iliq" },
    { key: "cool", label: "Sovuq" },
    { key: "vintage", label: "Vintage" },
    { key: "bw", label: "Q/O" },
];
const FILTER_CSS: Record<string, string> = {
    none: "none", grayscale: "grayscale(1)", sepia: "sepia(0.9)",
    warm: "sepia(0.35) saturate(1.4) hue-rotate(-10deg)",
    cool: "saturate(1.3) hue-rotate(20deg) brightness(1.05)",
    vintage: "sepia(0.5) contrast(1.15) brightness(0.9)",
    bw: "grayscale(1) contrast(1.15)",
};

// TEXT slide uchun fon ranglari (gradient bo'lmasa oddiy rang)
const BG_COLORS = [
    "#2B3EE8", "#00CEC8", "#EF4444", "#F59E0B", "#10B981",
    "#8B5CF6", "#EC4899", "#000000", "#EAB308", "#3B82F6",
];

// Text overlay ranglari
const TEXT_COLORS = ["#FFFFFF", "#000000", "#F59E0B", "#EF4444", "#00CEC8", "#8B5CF6", "#10B981"];

interface Slide {
    localId: string;
    mediaUrl: string;
    mediaType: "IMAGE" | "VIDEO" | "TEXT";
    caption: string;
    filter: string;
    bgColor: string | null;
    // Text overlay (bitta markazlashtirilgan; kengaytirish uchun keyingi versiyada array)
    overlayText?: string;
    overlayColor?: string;
    overlaySize?: number;
    overlayY?: number;   // 0-100%
}

interface UserTrack {
    id: string; title: string; artist: string | null; audioUrl: string;
}

function newTextSlide(): Slide {
    return {
        localId: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mediaUrl: "", mediaType: "TEXT", caption: "",
        filter: "none", bgColor: BG_COLORS[0],
    };
}
function newMediaSlide(url: string): Slide {
    return {
        localId: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mediaUrl: url, mediaType: isVid(url) ? "VIDEO" : "IMAGE",
        caption: "", filter: "none", bgColor: null,
    };
}

export function NxStoryCreate() {
    const { storyCreateOpen, setStoryCreateOpen } = useNxPlayer();
    const [slides, setSlides] = useState<Slide[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [tab, setTab] = useState<"none" | "filter" | "text" | "music" | "bg">("none");
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    // Story-level
    const [storyCaption, setStoryCaption] = useState("");
    const [musicTrackId, setMusicTrackId] = useState<string | null>(null);
    const [musicTitle, setMusicTitle] = useState<string | null>(null);
    const [myTracks, setMyTracks] = useState<UserTrack[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    // Reset ochilganda
    useEffect(() => {
        if (!storyCreateOpen) return;
        setSlides([]); setActiveIdx(0); setTab("none");
        setStoryCaption(""); setMusicTrackId(null); setMusicTitle(null);
        setUploading(false); setPosting(false);
        // O'z tracklarim
        fetch("/api/nexus/tracks?scope=mine").then(r => r.ok ? r.json() : null).then(d => {
            if (d?.tracks) setMyTracks(d.tracks.slice(0, 30));
        }).catch(() => { });
    }, [storyCreateOpen]);

    if (!storyCreateOpen) return null;

    const active = slides[activeIdx] || null;

    function updateActive(patch: Partial<Slide>) {
        setSlides(prev => prev.map((s, i) => i === activeIdx ? { ...s, ...patch } : s));
    }

    async function pick(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        if (slides.length >= 10) { alert("Maks 10 slide"); return; }
        setUploading(true);
        try {
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const blob = await upload(`nexus/story/${Date.now()}-${safe}`, file, {
                access: "public", handleUploadUrl: "/api/market/upload/client-token",
            });
            const s = newMediaSlide(blob.url);
            setSlides(prev => [...prev, s]);
            setActiveIdx(slides.length);
            setTab("none");
        } catch { alert("Yuklab bo'lmadi"); }
        finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    function addTextSlide() {
        if (slides.length >= 10) { alert("Maks 10 slide"); return; }
        const s = newTextSlide();
        setSlides(prev => [...prev, s]);
        setActiveIdx(slides.length);
        setTab("bg");
    }

    function removeSlide(idx: number) {
        setSlides(prev => prev.filter((_, i) => i !== idx));
        setActiveIdx(a => Math.max(0, Math.min(a, slides.length - 2)));
    }

    async function publish() {
        if (slides.length === 0 || posting) return;
        // TEXT slide caption bo'sh bo'lsa nima ko'rsatiladi? Cheklovsiz — foydalanuvchi ixtiyori
        setPosting(true);
        try {
            const payload = {
                caption: storyCaption.trim().slice(0, 300),
                musicTrackId: musicTrackId || undefined,
                musicTitle: musicTitle || undefined,
                slides: slides.map(s => ({
                    mediaUrl: s.mediaUrl,
                    mediaType: s.mediaType,
                    caption: s.caption,
                    filter: s.filter,
                    bgColor: s.bgColor,
                    overlays: s.overlayText
                        ? { texts: [{ text: s.overlayText, color: s.overlayColor || "#fff", size: s.overlaySize || 32, y: s.overlayY ?? 50 }] }
                        : null,
                })),
            };
            const res = await fetch("/api/nexus/stories", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setStoryCreateOpen(false);
                setSlides([]);
            } else {
                const d = await res.json().catch(() => ({}));
                alert(d.error || "Xato");
            }
        } finally { setPosting(false); }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={() => setStoryCreateOpen(false)}>
            <div onClick={e => e.stopPropagation()}
                className="relative flex flex-col overflow-hidden rounded-none sm:rounded-2xl"
                style={{ width: "min(420px, 100vw)", height: "min(760px, 100vh)", background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)" }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-sm font-black text-white">
                        Hikoya {slides.length > 0 && `(${slides.length}/10)`}
                    </h3>
                    <button onClick={() => setStoryCreateOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Body */}
                {slides.length === 0 ? (
                    /* Bo'sh holat — birinchi slide qo'shish */
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                        <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="flex flex-col items-center justify-center gap-3 w-full flex-1 rounded-2xl border-2 border-dashed"
                            style={{ borderColor: "rgba(43,62,232,0.35)", background: "rgba(43,62,232,0.05)" }}>
                            {uploading ? <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#00CEC8" }} /> : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <ImagePlus className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-white">Rasm yoki video tanlang</span>
                                    <span className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>Yoki matnli slide yarating</span>
                                </>
                            )}
                        </button>
                        <button onClick={addTextSlide} className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                            style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.30)" }}>
                            <Type className="w-4 h-4" /> Matnli slide
                        </button>
                        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={e => pick(e.target.files)} className="hidden" />
                    </div>
                ) : (
                    <>
                        {/* Slide preview (asosiy zona) */}
                        <div className="relative flex-1 overflow-hidden" style={{ background: active?.bgColor || "#000" }}>
                            {active && (
                                <>
                                    {active.mediaType === "TEXT" ? (
                                        <div className="w-full h-full flex items-center justify-center px-6"
                                            style={{ background: active.bgColor || "#2B3EE8" }}>
                                            <p className="text-2xl sm:text-3xl font-black text-white text-center leading-tight"
                                                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>
                                                {active.caption || "Matn yozing..."}
                                            </p>
                                        </div>
                                    ) : active.mediaType === "VIDEO" ? (
                                        <video src={active.mediaUrl} autoPlay loop muted playsInline
                                            style={{ filter: FILTER_CSS[active.filter] ?? "none" }}
                                            className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={active.mediaUrl} alt=""
                                            style={{ filter: FILTER_CSS[active.filter] ?? "none" }}
                                            className="w-full h-full object-cover" />
                                    )}

                                    {/* Text overlay preview */}
                                    {active.overlayText && active.mediaType !== "TEXT" && (
                                        <div className="absolute left-0 right-0 flex items-center justify-center px-4 pointer-events-none"
                                            style={{ top: `${active.overlayY ?? 50}%`, transform: "translateY(-50%)" }}>
                                            <p className="font-black text-center" style={{
                                                color: active.overlayColor || "#fff",
                                                fontSize: `${active.overlaySize || 32}px`,
                                                textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                                                maxWidth: "90%",
                                            }}>{active.overlayText}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Slide navigatsiya arrows */}
                            {activeIdx > 0 && (
                                <button onClick={() => setActiveIdx(activeIdx - 1)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full"
                                    style={{ background: "rgba(0,0,0,0.5)" }}>
                                    <ChevronLeft className="w-5 h-5 text-white" />
                                </button>
                            )}
                            {activeIdx < slides.length - 1 && (
                                <button onClick={() => setActiveIdx(activeIdx + 1)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full"
                                    style={{ background: "rgba(0,0,0,0.5)" }}>
                                    <ChevronRight className="w-5 h-5 text-white" />
                                </button>
                            )}
                        </div>

                        {/* Editor panel (tab ochilib turgan bo'lsa) */}
                        {tab !== "none" && (
                            <div className="px-4 py-3 flex-shrink-0 max-h-64 overflow-y-auto" style={{ background: "rgba(11,18,40,0.85)", borderTop: "1px solid rgba(43,62,232,0.14)", scrollbarWidth: "none" }}>
                                {tab === "filter" && active && active.mediaType !== "TEXT" && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.75)" }}>Filter</p>
                                        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                                            {FILTERS.map(f => (
                                                <button key={f.key} onClick={() => updateActive({ filter: f.key })}
                                                    className="px-3 py-2 rounded-lg text-[11px] font-bold flex-shrink-0"
                                                    style={active.filter === f.key
                                                        ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                                        : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)", color: "rgba(160,180,230,0.85)" }}>
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {tab === "bg" && active && active.mediaType === "TEXT" && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.75)" }}>Fon rangi</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {BG_COLORS.map(c => (
                                                <button key={c} onClick={() => updateActive({ bgColor: c })}
                                                    className="w-8 h-8 rounded-lg"
                                                    style={{ background: c, border: active.bgColor === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.20)" }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {tab === "text" && active && (
                                    <div className="space-y-3">
                                        {active.mediaType === "TEXT" ? (
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>Matn</p>
                                                <textarea value={active.caption} onChange={e => updateActive({ caption: e.target.value.slice(0, 300) })}
                                                    rows={3} placeholder="Xohlagan matnni yozing..."
                                                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)" }} />
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>Overlay matn</p>
                                                    <input value={active.overlayText || ""} onChange={e => updateActive({ overlayText: e.target.value.slice(0, 200) })}
                                                        placeholder="Rasm ustiga matn..."
                                                        className="w-full h-10 rounded-lg px-3 text-sm text-white outline-none"
                                                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)" }} />
                                                </div>
                                                {active.overlayText && (
                                                    <>
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>Rang</p>
                                                            <div className="flex gap-1.5">
                                                                {TEXT_COLORS.map(c => (
                                                                    <button key={c} onClick={() => updateActive({ overlayColor: c })}
                                                                        className="w-7 h-7 rounded-lg"
                                                                        style={{ background: c, border: (active.overlayColor || "#fff") === c ? "2px solid #00CEC8" : "1px solid rgba(255,255,255,0.20)" }} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>Hajm: {active.overlaySize || 32}px</p>
                                                            <input type="range" min={16} max={72} value={active.overlaySize || 32}
                                                                onChange={e => updateActive({ overlaySize: Number(e.target.value) })}
                                                                className="w-full" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(140,160,210,0.75)" }}>Joylashuv (Y): {active.overlayY ?? 50}%</p>
                                                            <input type="range" min={10} max={90} value={active.overlayY ?? 50}
                                                                onChange={e => updateActive({ overlayY: Number(e.target.value) })}
                                                                className="w-full" />
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                                {tab === "music" && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.75)" }}>
                                            Musiqa {musicTrackId && `— ${musicTitle}`}
                                        </p>
                                        {musicTrackId && (
                                            <button onClick={() => { setMusicTrackId(null); setMusicTitle(null); }}
                                                className="w-full mb-2 py-2 rounded-lg text-xs font-bold"
                                                style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }}>
                                                Musiqani olib tashlash
                                            </button>
                                        )}
                                        {myTracks.length === 0 ? (
                                            <p className="text-xs py-4 text-center" style={{ color: "rgba(140,160,210,0.65)" }}>
                                                Sizda hali audio yo&apos;q. Nexus &quot;Media&quot; bo&apos;limidan qo&apos;shing.
                                            </p>
                                        ) : (
                                            <div className="space-y-1">
                                                {myTracks.map(t => (
                                                    <button key={t.id}
                                                        onClick={() => { setMusicTrackId(t.id); setMusicTitle(`${t.title}${t.artist ? " — " + t.artist : ""}`); }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left"
                                                        style={{ background: musicTrackId === t.id ? "rgba(0,206,200,0.12)" : "rgba(43,62,232,0.06)" }}>
                                                        <Music className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-white truncate">{t.title}</p>
                                                            {t.artist && <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.75)" }}>{t.artist}</p>}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab bar */}
                        <div className="flex items-center gap-1 px-3 py-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                            {active && active.mediaType !== "TEXT" && (
                                <button onClick={() => setTab(t => t === "filter" ? "none" : "filter")}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold"
                                    style={tab === "filter" ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8" } : { background: "rgba(43,62,232,0.06)", color: "rgba(160,180,230,0.85)" }}>
                                    <Sparkles className="w-3.5 h-3.5" /> Filter
                                </button>
                            )}
                            {active && active.mediaType === "TEXT" && (
                                <button onClick={() => setTab(t => t === "bg" ? "none" : "bg")}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold"
                                    style={tab === "bg" ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8" } : { background: "rgba(43,62,232,0.06)", color: "rgba(160,180,230,0.85)" }}>
                                    <Palette className="w-3.5 h-3.5" /> Fon
                                </button>
                            )}
                            <button onClick={() => setTab(t => t === "text" ? "none" : "text")}
                                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold"
                                style={tab === "text" ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8" } : { background: "rgba(43,62,232,0.06)", color: "rgba(160,180,230,0.85)" }}>
                                <Type className="w-3.5 h-3.5" /> Matn
                            </button>
                            <button onClick={() => setTab(t => t === "music" ? "none" : "music")}
                                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold"
                                style={tab === "music" ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8" } : { background: "rgba(43,62,232,0.06)", color: "rgba(160,180,230,0.85)" }}>
                                <Music className="w-3.5 h-3.5" /> Musiqa
                                {musicTrackId && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00CEC8" }} />}
                            </button>
                        </div>

                        {/* Slide thumbnail strip + add + delete */}
                        <div className="flex items-center gap-1.5 px-3 pb-2 pt-1 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                            {slides.map((s, i) => (
                                <button key={s.localId} onClick={() => setActiveIdx(i)}
                                    className="relative flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden"
                                    style={{ border: i === activeIdx ? "2px solid #00CEC8" : "1px solid rgba(255,255,255,0.15)", background: s.bgColor || "#111" }}>
                                    {s.mediaType === "IMAGE" && <img src={s.mediaUrl} alt="" className="w-full h-full object-cover" />}
                                    {s.mediaType === "VIDEO" && <video src={s.mediaUrl} muted className="w-full h-full object-cover" />}
                                    {s.mediaType === "TEXT" && <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold px-1 text-center truncate">{s.caption || "Aa"}</div>}
                                    {i === activeIdx && slides.length > 1 && (
                                        <span onClick={(e) => { e.stopPropagation(); removeSlide(i); }}
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
                                            style={{ background: "#EF4444" }}>
                                            <Trash2 className="w-2.5 h-2.5 text-white" />
                                        </span>
                                    )}
                                </button>
                            ))}
                            {slides.length < 10 && (
                                <>
                                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                                        className="flex-shrink-0 w-12 h-16 rounded-lg flex items-center justify-center"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px dashed rgba(43,62,232,0.30)" }}>
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
                                    </button>
                                    <button onClick={addTextSlide}
                                        className="flex-shrink-0 w-12 h-16 rounded-lg flex items-center justify-center"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px dashed rgba(43,62,232,0.30)" }}>
                                        <Type className="w-4 h-4 text-white" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Publish bar */}
                        <div className="flex items-center gap-2 px-3 pb-3 flex-shrink-0">
                            <input value={storyCaption} onChange={e => setStoryCaption(e.target.value.slice(0, 300))}
                                placeholder="Story izohi (ixtiyoriy)..."
                                className="flex-1 h-10 rounded-full px-4 text-sm text-white outline-none"
                                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)", caretColor: "#00CEC8" }} />
                            <button onClick={publish} disabled={posting || slides.length === 0}
                                className="w-10 h-10 flex items-center justify-center rounded-full text-white flex-shrink-0 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>

                        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={e => pick(e.target.files)} className="hidden" />
                    </>
                )}
            </div>
        </div>
    );
}
