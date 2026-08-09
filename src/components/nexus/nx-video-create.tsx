"use client";

import { useState, useRef, useEffect } from "react";
import { upload } from "@vercel/blob/client";
import {
    X, Film, Loader2, Send, Trash2, ImageIcon, Plus, Hash, ShieldAlert,
    Coins, Layers, Check, ChevronDown, RectangleHorizontal, RectangleVertical, Sparkles,
} from "lucide-react";
import { currencySymbol, type Currency } from "@/lib/money";

const CATEGORIES = [
    { id: "", label: "Kategoriyasiz" },
    { id: "kino", label: "Kino" },
    { id: "musiqa", label: "Musiqa" },
    { id: "gaming", label: "Gaming" },
    { id: "tech", label: "Tech" },
    { id: "talim", label: "Ta'lim" },
    { id: "sport", label: "Sport" },
    { id: "boshqa", label: "Boshqa" },
];

type Orient = "HORIZONTAL" | "VERTICAL";

interface MyVid { id: string; title: string; thumbUrl: string | null }

// Videodan thumbnail kadri + davomiyligi + o'lchamini client'da oladi
function processVideo(file: File): Promise<{ thumb: Blob | null; durationSec: number; width: number; height: number }> {
    return new Promise(resolve => {
        const v = document.createElement("video");
        v.preload = "metadata"; v.muted = true; v.src = URL.createObjectURL(file);
        let duration = 0, w = 0, h = 0;
        v.onloadedmetadata = () => {
            duration = v.duration || 0; w = v.videoWidth || 0; h = v.videoHeight || 0;
            try { v.currentTime = Math.min(1, duration / 2 || 0); } catch { /* noop */ }
        };
        v.onseeked = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = v.videoWidth || 1280; canvas.height = v.videoHeight || 720;
                const ctx = canvas.getContext("2d");
                if (!ctx) { URL.revokeObjectURL(v.src); return resolve({ thumb: null, durationSec: Math.round(duration), width: w, height: h }); }
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(b => { URL.revokeObjectURL(v.src); resolve({ thumb: b, durationSec: Math.round(duration), width: w, height: h }); }, "image/jpeg", 0.82);
            } catch { URL.revokeObjectURL(v.src); resolve({ thumb: null, durationSec: Math.round(duration), width: w, height: h }); }
        };
        v.onerror = () => resolve({ thumb: null, durationSec: 0, width: 0, height: 0 });
    });
}

const blobImg = (file: File | Blob, prefix: string) =>
    upload(`nexus/video/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`, file, {
        access: "public", handleUploadUrl: "/api/market/upload/client-token",
    });

export function NxVideoCreate({ open, onClose, onCreated, kind: defaultKind = "LONG" }: {
    open: boolean; onClose: () => void; onCreated?: () => void; kind?: "LONG" | "SHORT";
}) {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [autoThumb, setAutoThumb] = useState<string | null>(null);   // avtomatik kadr
    const [coverUrl, setCoverUrl] = useState<string | null>(null);     // foydalanuvchi muqovasi (ustun)
    const [durationSec, setDurationSec] = useState(0);
    const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    const [orientation, setOrientation] = useState<Orient>(defaultKind === "SHORT" ? "VERTICAL" : "HORIZONTAL");

    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [descImages, setDescImages] = useState<string[]>([]);
    const [isMature, setIsMature] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [price, setPrice] = useState<number>(0);

    const [myVids, setMyVids] = useState<MyVid[]>([]);
    const [prevVideoId, setPrevVideoId] = useState<string>("");
    const [seriesOpen, setSeriesOpen] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);
    const [coverBusy, setCoverBusy] = useState(false);
    const [descBusy, setDescBusy] = useState(false);
    const [posting, setPosting] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [aiBusy, setAiBusy] = useState<null | "caption" | "tags">(null);
    const [myCurrency, setMyCurrency] = useState<Currency>("UZS");

    const coverRef = useRef<HTMLInputElement>(null);
    const descImgRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLInputElement>(null);

    // Series uchun o'z videolarimni yuklash (faqat video tanlangach)
    useEffect(() => {
        if (!videoUrl || myVids.length) return;
        fetch("/api/nexus/videos?scope=mine&limit=50&sort=new")
            .then(r => r.json()).then(d => setMyVids(d.videos ?? [])).catch(() => { });
    }, [videoUrl, myVids.length]);

    // Ijodkor valyutasi (narx shu valyutada)
    useEffect(() => {
        if (!open) return;
        fetch("/api/pay/wallet").then(r => r.json()).then(d => setMyCurrency(d.currency === "USD" ? "USD" : "UZS")).catch(() => { });
    }, [open]);

    if (!open) return null;

    function reset() {
        setVideoUrl(null); setAutoThumb(null); setCoverUrl(null); setDurationSec(0); setDims({ w: 0, h: 0 });
        setOrientation(defaultKind === "SHORT" ? "VERTICAL" : "HORIZONTAL");
        setTitle(""); setDesc(""); setCategory(""); setTags([]); setTagInput(""); setDescImages([]);
        setIsMature(false); setIsPaid(false); setPrice(0);
        setMyVids([]); setPrevVideoId(""); setSeriesOpen(false);
        setUploading(false); setUploadPct(0); setCoverBusy(false); setDescBusy(false); setPosting(false); setErr(null);
    }
    function close() { reset(); onClose(); }

    // AI yordam — sarlavhadan tavsif / teglar
    async function aiAssist(action: "caption" | "tags") {
        if (aiBusy) return;
        const input = (action === "caption" ? title : (desc || title)).trim();
        if (!input) { setErr("Avval sarlavha kiriting"); return; }
        setAiBusy(action); setErr(null);
        try {
            const res = await fetch("/api/nexus/ai-assist", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, input, kind: "video" }),
            });
            const d = await res.json();
            if (!res.ok) { setErr(d.error || "AI xatosi"); return; }
            if (action === "caption" && d.result) setDesc(d.result);
            if (action === "tags" && Array.isArray(d.tags)) setTags(prev => [...new Set([...prev, ...d.tags])].slice(0, 50));
        } catch {
            setErr("AI javob bermadi");
        } finally { setAiBusy(null); }
    }

    async function pickVideo(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        setUploading(true); setErr(null); setUploadPct(0);
        try {
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const vb = await upload(`nexus/video/${Date.now()}-${safe}`, file, {
                access: "public", handleUploadUrl: "/api/market/upload/client-token",
                onUploadProgress: p => setUploadPct(Math.round(p.percentage)),
            });
            setVideoUrl(vb.url);
            const { thumb, durationSec: dur, width, height } = await processVideo(file);
            setDurationSec(dur); setDims({ w: width, h: height });
            if (width && height) setOrientation(width >= height ? "HORIZONTAL" : "VERTICAL");
            if (thumb) { const tb = await blobImg(thumb, "thumb"); setAutoThumb(tb.url); }
            setTitle(t => t || file.name.replace(/\.[^.]+$/, "").slice(0, 120));
        } catch (e) {
            setErr("Yuklashda xatolik: " + (e as Error).message.slice(0, 100));
        } finally {
            setUploading(false);
            if (videoRef.current) videoRef.current.value = "";
        }
    }

    async function pickCover(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        setCoverBusy(true); setErr(null);
        try { const b = await blobImg(file, "cover"); setCoverUrl(b.url); }
        catch { setErr("Muqova yuklanmadi"); }
        finally { setCoverBusy(false); if (coverRef.current) coverRef.current.value = ""; }
    }

    async function addDescImages(files: FileList | null) {
        if (!files || files.length === 0) return;
        setDescBusy(true); setErr(null);
        try {
            const urls: string[] = [];
            for (const f of Array.from(files)) { const b = await blobImg(f, "ev"); urls.push(b.url); }
            setDescImages(prev => [...prev, ...urls].slice(0, 30));
        } catch { setErr("Rasm yuklanmadi"); }
        finally { setDescBusy(false); if (descImgRef.current) descImgRef.current.value = ""; }
    }

    function commitTag() {
        const parts = tagInput.split(/[\s,#]+/).map(s => s.trim()).filter(Boolean);
        if (parts.length) setTags(prev => [...new Set([...prev, ...parts])].slice(0, 50));
        setTagInput("");
    }

    async function publish() {
        if (!videoUrl || !title.trim() || posting) return;
        setPosting(true); setErr(null);
        try {
            const res = await fetch("/api/nexus/videos", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title, description: desc, videoUrl,
                    thumbUrl: coverUrl || autoThumb, durationSec,
                    width: dims.w, height: dims.h, orientation, category,
                    tags, descImages, isMature,
                    price: isPaid ? Math.max(0, Math.round(price)) : 0,
                    prevVideoId: prevVideoId || null,
                }),
            });
            if (res.ok) { onCreated?.(); close(); }
            else { const d = await res.json().catch(() => ({})); setErr(d.error || "Xatolik"); }
        } catch { setErr("Tarmoq xatosi"); }
        finally { setPosting(false); }
    }

    const preview = coverUrl || autoThumb;
    const prevVid = myVids.find(v => v.id === prevVideoId);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }} onClick={close}>
            <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-lg rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.25)", maxHeight: "94vh" }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-sm font-black text-white">Video yuklash</h3>
                    <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {!videoUrl ? (
                        /* ── Fayl tanlash — <label> orqali (ishonchli, JS .click() yo'q) ── */
                        <label className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer"
                            style={{ borderColor: "rgba(43,62,232,0.35)", background: "rgba(43,62,232,0.05)" }}>
                            {uploading ? (
                                <>
                                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#00CEC8" }} />
                                    <span className="text-xs font-bold" style={{ color: "rgba(120,140,185,0.9)" }}>Yuklanmoqda... {uploadPct}%</span>
                                    <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(43,62,232,0.15)" }}>
                                        <div className="h-full" style={{ width: `${uploadPct}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)", transition: "width 0.2s" }} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <Film className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-white">Video tanlang</span>
                                    <span className="text-[11px] text-center px-4" style={{ color: "rgba(120,140,185,0.7)" }}>Istalgan format va o&apos;lcham · cheksiz · vertikal yoki gorizontal</span>
                                </>
                            )}
                            <input ref={videoRef} type="file" accept="video/*" onChange={e => pickVideo(e.target.files)} disabled={uploading} className="sr-only" />
                        </label>
                    ) : (
                        <div className="space-y-4">
                            {/* Muqova / preview */}
                            <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: orientation === "VERTICAL" ? "9/16" : "16/9", background: "#000", margin: orientation === "VERTICAL" ? "0 auto" : undefined, width: orientation === "VERTICAL" ? 158 : "100%" }}>
                                {preview
                                    ? <img src={preview} alt="" className="w-full h-full object-cover" />
                                    : <video src={videoUrl} className="w-full h-full object-contain" />}
                                <button onClick={() => { setVideoUrl(null); setAutoThumb(null); setCoverUrl(null); }}
                                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}>
                                    <Trash2 className="w-4 h-4 text-white" />
                                </button>
                                {durationSec > 0 && <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "rgba(0,0,0,0.7)" }}>{Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}</span>}
                            </div>

                            {/* Muqova rasmi tugmasi */}
                            <div className="flex items-center gap-2">
                                <label className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold cursor-pointer" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(160,180,230,0.9)" }}>
                                    {coverBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                    {coverUrl ? "Muqovani almashtirish" : "Muqova rasmi (ixtiyoriy)"}
                                    <input ref={coverRef} type="file" accept="image/*" onChange={e => pickCover(e.target.files)} className="sr-only" />
                                </label>
                                {coverUrl && <button onClick={() => setCoverUrl(null)} className="h-10 px-3 rounded-xl text-xs font-bold" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>Avto</button>}
                            </div>

                            {/* Orientation: G.Video / V.Video */}
                            <div>
                                <p className="text-[11px] font-bold mb-1.5" style={{ color: "rgba(140,160,210,0.7)" }}>Format</p>
                                <div className="flex gap-2">
                                    {([["HORIZONTAL", "Gorizontal (G.Video)", RectangleHorizontal], ["VERTICAL", "Vertikal (V.Video)", RectangleVertical]] as const).map(([id, label, Icon]) => (
                                        <button key={id} onClick={() => setOrientation(id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition"
                                            style={orientation === id ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", color: "rgba(140,160,210,0.8)" }}>
                                            <Icon className="w-4 h-4" />{label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sarlavha (cheksiz) */}
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sarlavha *"
                                className="w-full h-11 px-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", caretColor: "#00CEC8" }} />

                            {/* Tavsif (cheksiz) */}
                            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Tavsif — cheksiz uzunlikda yozishingiz mumkin" rows={4}
                                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-y"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", caretColor: "#00CEC8", minHeight: 90 }} />

                            {/* AI yordam (Humo AI) — sarlavhadan tavsif/teglar */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-black mr-0.5" style={{ color: "#00CEC8" }}><Sparkles className="w-3 h-3" />AI</span>
                                <button onClick={() => aiAssist("caption")} disabled={!!aiBusy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-50"
                                    style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.25)", color: "rgba(150,230,225,0.95)" }}>
                                    {aiBusy === "caption" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Tavsif yoz
                                </button>
                                <button onClick={() => aiAssist("tags")} disabled={!!aiBusy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-50"
                                    style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.25)", color: "rgba(150,230,225,0.95)" }}>
                                    {aiBusy === "tags" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Teglar
                                </button>
                            </div>

                            {/* Tavsif dalil rasmlari */}
                            <div>
                                <p className="text-[11px] font-bold mb-1.5" style={{ color: "rgba(140,160,210,0.7)" }}>Dalil rasmlari (ixtiyoriy)</p>
                                <div className="flex flex-wrap gap-2">
                                    {descImages.map((u, i) => (
                                        <div key={u} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(43,62,232,0.2)" }}>
                                            <img src={u} alt="" className="w-full h-full object-cover" />
                                            <button onClick={() => setDescImages(p => p.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.65)" }}>
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="w-16 h-16 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: "rgba(43,62,232,0.08)", border: "1px dashed rgba(43,62,232,0.3)" }}>
                                        {descBusy ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00CEC8" }} /> : <Plus className="w-5 h-5" style={{ color: "rgba(140,160,210,0.8)" }} />}
                                        <input ref={descImgRef} type="file" accept="image/*" multiple onChange={e => addDescImages(e.target.files)} className="sr-only" />
                                    </label>
                                </div>
                            </div>

                            {/* Teglar */}
                            <div>
                                <p className="text-[11px] font-bold mb-1.5 flex items-center gap-1" style={{ color: "rgba(140,160,210,0.7)" }}><Hash className="w-3 h-3" />Teglar</p>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {tags.map(t => (
                                            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(43,62,232,0.14)", color: "#9db4f0" }}>
                                                #{t}<button onClick={() => setTags(p => p.filter(x => x !== t))}><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" || e.key === "," || e.key === " ") { e.preventDefault(); commitTag(); } }}
                                    onBlur={commitTag} placeholder="Teg yozing va Enter bosing"
                                    className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", caretColor: "#00CEC8" }} />
                            </div>

                            {/* Kategoriya */}
                            <div>
                                <p className="text-[11px] font-bold mb-1.5" style={{ color: "rgba(140,160,210,0.7)" }}>Kategoriya</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {CATEGORIES.map(c => (
                                        <button key={c.id} onClick={() => setCategory(c.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                                            style={category === c.id ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", color: "rgba(140,160,210,0.8)" }}>
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Narx */}
                            <div>
                                <p className="text-[11px] font-bold mb-1.5 flex items-center gap-1" style={{ color: "rgba(140,160,210,0.7)" }}><Coins className="w-3 h-3" />Narx</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsPaid(false)} className="flex-1 py-2.5 rounded-xl text-xs font-black transition"
                                        style={!isPaid ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", color: "rgba(140,160,210,0.8)" }}>Bepul</button>
                                    <button onClick={() => setIsPaid(true)} className="flex-1 py-2.5 rounded-xl text-xs font-black transition"
                                        style={isPaid ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", color: "rgba(140,160,210,0.8)" }}>Pullik</button>
                                </div>
                                {isPaid && (
                                    <div className="mt-2">
                                        <div className="relative">
                                            <input type="number" min={0} value={price || ""} onChange={e => setPrice(Number(e.target.value))} placeholder="Summa"
                                                className="w-full h-10 px-3 pr-10 rounded-xl text-sm text-white outline-none"
                                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", caretColor: "#00CEC8" }} />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black" style={{ color: "#00CEC8" }}>{currencySymbol(myCurrency)}</span>
                                        </div>
                                        <p className="text-[10px] mt-1" style={{ color: "rgba(120,140,185,0.7)" }}>Sotib olingach pul For Pay hisobingizga tushadi.</p>
                                    </div>
                                )}
                            </div>

                            {/* Series — avvalgi qism (styled dropdown, native select EMAS) */}
                            <div>
                                <p className="text-[11px] font-bold mb-1.5 flex items-center gap-1" style={{ color: "rgba(140,160,210,0.7)" }}><Layers className="w-3 h-3" />Avvalgi qism (ixtiyoriy)</p>
                                <div className="relative">
                                    <button onClick={() => setSeriesOpen(o => !o)} className="w-full h-10 px-3 rounded-xl text-sm text-left text-white flex items-center justify-between"
                                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                        <span className="truncate" style={{ color: prevVid ? "#fff" : "rgba(120,140,185,0.7)" }}>{prevVid ? prevVid.title : "Yo'q — birinchi yoki mustaqil qism"}</span>
                                        <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.7)" }} />
                                    </button>
                                    {seriesOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setSeriesOpen(false)} />
                                            <div className="absolute z-20 mt-1 left-0 right-0 rounded-xl overflow-hidden max-h-60 overflow-y-auto" style={{ background: "rgba(12,16,38,0.99)", border: "1px solid rgba(43,62,232,0.3)", scrollbarWidth: "none" }}>
                                                <button onClick={() => { setPrevVideoId(""); setSeriesOpen(false); }} className="w-full px-3 py-2.5 text-left text-xs font-bold flex items-center justify-between hover:bg-white/5" style={{ color: "rgba(160,180,230,0.9)" }}>
                                                    Yo&apos;q {!prevVideoId && <Check className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />}
                                                </button>
                                                {myVids.length === 0 && <p className="px-3 py-3 text-[11px]" style={{ color: "rgba(120,140,185,0.6)" }}>Sizda hali video yo&apos;q</p>}
                                                {myVids.map(v => (
                                                    <button key={v.id} onClick={() => { setPrevVideoId(v.id); setSeriesOpen(false); }} className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-white/5">
                                                        <div className="w-10 h-6 rounded overflow-hidden flex-shrink-0" style={{ background: "rgba(43,62,232,0.15)" }}>{v.thumbUrl && <img src={v.thumbUrl} alt="" className="w-full h-full object-cover" />}</div>
                                                        <span className="text-xs font-bold text-white truncate flex-1">{v.title}</span>
                                                        {prevVideoId === v.id && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] mt-1" style={{ color: "rgba(120,140,185,0.6)" }}>Keyingi qismni hozir joylamasangiz, bu qism so&apos;nggi qism deb qabul qilinadi.</p>
                            </div>

                            {/* 18+ */}
                            <button onClick={() => setIsMature(m => !m)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition"
                                style={isMature ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" } : { background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                <ShieldAlert className="w-5 h-5 flex-shrink-0" style={{ color: isMature ? "#f87171" : "rgba(140,160,210,0.7)" }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white">18+ (voyaga yetmaganlar ko&apos;rmasin)</p>
                                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.7)" }}>Humo ID&apos;da 18 yoshdan kichiklarga ko&apos;rinmaydi</p>
                                </div>
                                <div className="w-10 h-6 rounded-full flex items-center px-0.5 transition" style={{ background: isMature ? "#ef4444" : "rgba(43,62,232,0.2)", justifyContent: isMature ? "flex-end" : "flex-start" }}>
                                    <div className="w-5 h-5 rounded-full bg-white" />
                                </div>
                            </button>

                            {err && <p className="text-xs text-red-400 font-bold">{err}</p>}

                            <button onClick={publish} disabled={posting || !title.trim() || coverBusy || descBusy}
                                className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Joylash</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
