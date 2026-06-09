"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { X, Film, Loader2, Send, Trash2 } from "lucide-react";

const CATEGORIES = [
    { id: "", label: "Kategoriyasiz" },
    { id: "gaming", label: "Gaming" },
    { id: "tech", label: "Tech" },
    { id: "talim", label: "Ta'lim" },
    { id: "musiqa", label: "Musiqa" },
    { id: "kino", label: "Kino" },
    { id: "sport", label: "Sport" },
    { id: "boshqa", label: "Boshqa" },
];

// Videodan thumbnail kadri + davomiyligini client'da oladi
function processVideo(file: File): Promise<{ thumb: Blob | null; durationSec: number }> {
    return new Promise(resolve => {
        const v = document.createElement("video");
        v.preload = "metadata"; v.muted = true; v.src = URL.createObjectURL(file);
        let duration = 0;
        v.onloadedmetadata = () => { duration = v.duration || 0; try { v.currentTime = Math.min(1, duration / 2 || 0); } catch { /* noop */ } };
        v.onseeked = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = v.videoWidth || 1280; canvas.height = v.videoHeight || 720;
                const ctx = canvas.getContext("2d");
                if (!ctx) { URL.revokeObjectURL(v.src); return resolve({ thumb: null, durationSec: Math.round(duration) }); }
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(b => { URL.revokeObjectURL(v.src); resolve({ thumb: b, durationSec: Math.round(duration) }); }, "image/jpeg", 0.8);
            } catch { URL.revokeObjectURL(v.src); resolve({ thumb: null, durationSec: Math.round(duration) }); }
        };
        v.onerror = () => resolve({ thumb: null, durationSec: 0 });
    });
}

export function NxVideoCreate({ open, onClose, onCreated, kind: defaultKind = "LONG" }: {
    open: boolean; onClose: () => void; onCreated?: () => void; kind?: "LONG" | "SHORT";
}) {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);
    const [durationSec, setDurationSec] = useState(0);
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [category, setCategory] = useState("");
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [kind, setKind] = useState<"LONG" | "SHORT">(defaultKind);
    const fileRef = useRef<HTMLInputElement>(null);

    if (!open) return null;

    function close() {
        setVideoUrl(null); setThumbUrl(null); setDurationSec(0);
        setTitle(""); setDesc(""); setCategory(""); setUploading(false); setPosting(false); setErr(null); setKind(defaultKind);
        onClose();
    }

    async function pick(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        setUploading(true); setErr(null);
        try {
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const vb = await upload(`nexus/video/${Date.now()}-${safe}`, file, { access: "public", handleUploadUrl: "/api/market/upload/client-token" });
            setVideoUrl(vb.url);
            const { thumb, durationSec: dur } = await processVideo(file);
            setDurationSec(dur);
            if (thumb) {
                const tb = await upload(`nexus/video/thumb-${Date.now()}.jpg`, thumb, { access: "public", handleUploadUrl: "/api/market/upload/client-token" });
                setThumbUrl(tb.url);
            }
            setTitle(t => t || file.name.replace(/\.[^.]+$/, "").slice(0, 100));
        } catch (e) {
            setErr("Yuklashda xatolik: " + (e as Error).message.slice(0, 80));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    async function publish() {
        if (!videoUrl || !title.trim() || posting) return;
        setPosting(true); setErr(null);
        try {
            const res = await fetch("/api/nexus/videos", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description: desc, videoUrl, thumbUrl, durationSec, kind, category }),
            });
            if (res.ok) { onCreated?.(); close(); }
            else { const d = await res.json().catch(() => ({})); setErr(d.error || "Xatolik"); }
        } catch { setErr("Tarmoq xatosi"); }
        finally { setPosting(false); }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }} onClick={close}>
            <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-lg rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.25)", maxHeight: "92vh" }}>
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-sm font-black text-white">{kind === "SHORT" ? "Short yuklash" : "Video yuklash"}</h3>
                    <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {!videoUrl ? (
                        <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed"
                            style={{ borderColor: "rgba(43,62,232,0.35)", background: "rgba(43,62,232,0.05)" }}>
                            {uploading ? (
                                <><Loader2 className="w-10 h-10 animate-spin" style={{ color: "#00CEC8" }} /><span className="text-xs" style={{ color: "rgba(120,140,185,0.8)" }}>Yuklanmoqda...</span></>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <Film className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-white">Video tanlang</span>
                                    <span className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>MP4, WebM, MOV · maks 100MB</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/9", background: "#000" }}>
                                {thumbUrl
                                    ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                                    : <video src={videoUrl} className="w-full h-full object-contain" />}
                                <button onClick={() => { setVideoUrl(null); setThumbUrl(null); }}
                                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}>
                                    <Trash2 className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                {(["LONG", "SHORT"] as const).map(k => (
                                    <button key={k} onClick={() => setKind(k)} className="flex-1 py-2 rounded-xl text-xs font-black transition"
                                        style={kind === k ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" } : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", color: "rgba(140,160,210,0.8)" }}>
                                        {k === "LONG" ? "Video" : "Short"}
                                    </button>
                                ))}
                            </div>
                            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 200))} placeholder="Sarlavha *"
                                className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", caretColor: "#00CEC8" }} />
                            <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0, 2000))} placeholder="Tavsif (ixtiyoriy)" rows={3}
                                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", caretColor: "#00CEC8" }} />
                            <div className="flex flex-wrap gap-1.5">
                                {CATEGORIES.map(c => (
                                    <button key={c.id} onClick={() => setCategory(c.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                                        style={category === c.id
                                            ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                            : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", color: "rgba(140,160,210,0.8)" }}>
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                            {err && <p className="text-xs text-red-400 font-bold">{err}</p>}
                            <button onClick={publish} disabled={posting || !title.trim()}
                                className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Joylash</>}
                            </button>
                        </div>
                    )}
                    <input ref={fileRef} type="file" accept="video/*" onChange={e => pick(e.target.files)} className="hidden" />
                </div>
            </div>
        </div>
    );
}
