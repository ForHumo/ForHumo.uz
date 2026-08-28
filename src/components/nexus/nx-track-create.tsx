"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { X, Music2, Loader2, Send, ImageIcon, Trash2, Mic2, Video as VideoIcon, FileText } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxTrackCreate — audio yuklash (musiqa / podkast / audiokitob)
// Audio + muqova Vercel Blob'ga (client upload), davomiylik <audio> metadata'dan.
// ─────────────────────────────────────────────────────────────────────────────

type TrackKind = "MUSIC" | "PODCAST" | "AUDIOBOOK";

const KINDS: { id: TrackKind; label: string }[] = [
    { id: "MUSIC", label: "Musiqa" },
    { id: "PODCAST", label: "Podkast" },
    { id: "AUDIOBOOK", label: "Audiokitob" },
];

const GENRES = [
    { id: "", label: "Janrsiz" },
    { id: "pop", label: "Pop" },
    { id: "rok", label: "Rok" },
    { id: "rap", label: "Rap" },
    { id: "klassik", label: "Klassik" },
    { id: "xalq", label: "Xalq" },
    { id: "boshqa", label: "Boshqa" },
];

// Audio davomiyligini client'da olish
function audioDuration(file: File): Promise<number> {
    return new Promise(resolve => {
        const a = document.createElement("audio");
        a.preload = "metadata";
        a.src = URL.createObjectURL(file);
        a.onloadedmetadata = () => { const d = a.duration || 0; URL.revokeObjectURL(a.src); resolve(Math.round(d)); };
        a.onerror = () => resolve(0);
    });
}

export function NxTrackCreate({ open, onClose, onCreated, defaultKind = "MUSIC" }: {
    open: boolean; onClose: () => void; onCreated?: () => void; defaultKind?: TrackKind;
}) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [durationSec, setDurationSec] = useState(0);
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [kind, setKind] = useState<TrackKind>(defaultKind);
    const [genre, setGenre] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);
    const [coverBusy, setCoverBusy] = useState(false);
    const [posting, setPosting] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    // Karaoke qismi (faqat MUSIC uchun ko'rinadi)
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoBusy, setVideoBusy] = useState(false);
    const [videoOrient, setVideoOrient] = useState<"HORIZONTAL" | "VERTICAL">("HORIZONTAL");
    const [instrumentalUrl, setInstrumentalUrl] = useState<string | null>(null);
    const [instrBusy, setInstrBusy] = useState(false);
    const [lyricsLrc, setLyricsLrc] = useState<string>("");
    const [showKaraoke, setShowKaraoke] = useState(false);

    if (!open) return null;

    function reset() {
        setAudioUrl(null); setCoverUrl(null); setDurationSec(0);
        setTitle(""); setArtist(""); setKind(defaultKind); setGenre("");
        setUploading(false); setUploadPct(0); setCoverBusy(false); setPosting(false); setErr(null);
        setVideoUrl(null); setVideoBusy(false); setVideoOrient("HORIZONTAL");
        setInstrumentalUrl(null); setInstrBusy(false); setLyricsLrc(""); setShowKaraoke(false);
    }

    async function pickVideo(files: FileList | null) {
        const file = files?.[0]; if (!file) return;
        setVideoBusy(true); setErr(null);
        try {
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const blob = await upload(`nexus/track/video-${Date.now()}-${safe}`, file, {
                access: "public", handleUploadUrl: "/api/market/upload/client-token",
            });
            setVideoUrl(blob.url);
            // Orientation avto-aniqlash
            const v = document.createElement("video");
            v.src = blob.url; v.preload = "metadata";
            v.onloadedmetadata = () => setVideoOrient(v.videoHeight > v.videoWidth ? "VERTICAL" : "HORIZONTAL");
        } catch { setErr("Klip yuklanmadi"); }
        finally { setVideoBusy(false); }
    }

    async function pickInstrumental(files: FileList | null) {
        const file = files?.[0]; if (!file) return;
        setInstrBusy(true); setErr(null);
        try {
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const blob = await upload(`nexus/track/instr-${Date.now()}-${safe}`, file, {
                access: "public", handleUploadUrl: "/api/market/upload/client-token",
            });
            setInstrumentalUrl(blob.url);
        } catch { setErr("Instrumental yuklanmadi"); }
        finally { setInstrBusy(false); }
    }

    async function pickLrcFile(files: FileList | null) {
        const file = files?.[0]; if (!file) return;
        try { setLyricsLrc(await file.text()); }
        catch { setErr("LRC faylini o'qib bo'lmadi"); }
    }
    function close() { reset(); onClose(); }

    async function pickAudio(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        setUploading(true); setErr(null); setUploadPct(0);
        try {
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const blob = await upload(`nexus/track/${Date.now()}-${safe}`, file, {
                access: "public", handleUploadUrl: "/api/market/upload/client-token",
                onUploadProgress: p => setUploadPct(Math.round(p.percentage)),
            });
            setAudioUrl(blob.url);
            setDurationSec(await audioDuration(file));
            setTitle(t => t || file.name.replace(/\.[^.]+$/, "").slice(0, 120));
        } catch (e) {
            setErr("Yuklashda xatolik: " + (e as Error).message.slice(0, 80));
        } finally { setUploading(false); }
    }

    async function pickCover(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        setCoverBusy(true); setErr(null);
        try {
            const blob = await upload(`nexus/track/cover-${Date.now()}.jpg`, file, {
                access: "public", handleUploadUrl: "/api/market/upload/client-token",
            });
            setCoverUrl(blob.url);
        } catch { setErr("Muqova yuklanmadi"); }
        finally { setCoverBusy(false); }
    }

    async function publish() {
        if (!audioUrl || !title.trim() || posting) return;
        setPosting(true); setErr(null);
        try {
            const r = await fetch("/api/nexus/tracks", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title, artist, audioUrl, coverUrl, durationSec, kind, genre,
                    videoUrl, videoOrientation: videoOrient, instrumentalUrl, lyricsLrc: lyricsLrc || null,
                }),
            });
            if (r.ok) { onCreated?.(); close(); }
            else { const d = await r.json().catch(() => ({})); setErr(d.error || "Xatolik"); }
        } catch { setErr("Tarmoq xatosi"); }
        finally { setPosting(false); }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }} onClick={close}>
            <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-md rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(16,185,129,0.25)", maxHeight: "92vh" }}>

                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(16,185,129,0.14)" }}>
                    <h3 className="text-sm font-black text-white">Trek yuklash</h3>
                    <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(16,185,129,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-4" style={{ scrollbarWidth: "none" }}>
                    {!audioUrl ? (
                        <label className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer"
                            style={{ borderColor: "rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.05)" }}>
                            {uploading ? (
                                <>
                                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#10B981" }} />
                                    <span className="text-xs font-bold" style={{ color: "rgba(120,185,150,0.9)" }}>Yuklanmoqda... {uploadPct}%</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                                        <Music2 className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-white">Audio tanlang</span>
                                    <span className="text-[11px]" style={{ color: "rgba(120,160,140,0.7)" }}>MP3, M4A, WAV, OGG · cheksiz hajm</span>
                                </>
                            )}
                            <input type="file" accept="audio/*" onChange={e => pickAudio(e.target.files)} disabled={uploading} className="sr-only" />
                        </label>
                    ) : (
                        <>
                            {/* Muqova + audio preview */}
                            <div className="flex gap-3 items-center">
                                <label className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer flex items-center justify-center"
                                    style={{ background: "rgba(16,185,129,0.10)", border: "1px dashed rgba(16,185,129,0.35)" }}>
                                    {coverUrl
                                        ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                                        : coverBusy
                                            ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#10B981" }} />
                                            : <div className="flex flex-col items-center gap-1"><ImageIcon className="w-6 h-6" style={{ color: "rgba(16,185,129,0.6)" }} /><span className="text-[9px] font-bold" style={{ color: "rgba(120,160,140,0.8)" }}>Muqova</span></div>}
                                    <input type="file" accept="image/*" onChange={e => pickCover(e.target.files)} className="sr-only" />
                                </label>
                                <div className="flex-1 min-w-0">
                                    <audio src={audioUrl} controls className="w-full h-10" />
                                    <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-[10px]" style={{ color: "rgba(120,160,140,0.7)" }}>
                                            {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}
                                        </span>
                                        <button onClick={() => { setAudioUrl(null); setCoverUrl(null); }} className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                                            <Trash2 className="w-3 h-3" /> O&apos;chirish
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 200))} placeholder="Trek nomi *"
                                className="w-full h-11 px-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", caretColor: "#10B981" }} />

                            <input value={artist} onChange={e => setArtist(e.target.value.slice(0, 120))} placeholder="Ijrochi / muallif (ixtiyoriy)"
                                className="w-full h-11 px-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", caretColor: "#10B981" }} />

                            <div>
                                <p className="text-[11px] font-bold mb-1.5" style={{ color: "rgba(140,180,160,0.7)" }}>Turi</p>
                                <div className="flex gap-2">
                                    {KINDS.map(k => (
                                        <button key={k.id} onClick={() => setKind(k.id)} className="flex-1 py-2.5 rounded-xl text-xs font-black transition"
                                            style={kind === k.id
                                                ? { background: "linear-gradient(135deg,#10B981,#0D9488)", color: "#fff" }
                                                : { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.16)", color: "rgba(140,180,160,0.85)" }}>
                                            {k.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {kind === "MUSIC" && (
                                <div>
                                    <p className="text-[11px] font-bold mb-1.5" style={{ color: "rgba(140,180,160,0.7)" }}>Janr</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {GENRES.map(g => (
                                            <button key={g.id} onClick={() => setGenre(g.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                                                style={genre === g.id
                                                    ? { background: "linear-gradient(135deg,#10B981,#0D9488)", color: "#fff" }
                                                    : { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.16)", color: "rgba(140,180,160,0.85)" }}>
                                                {g.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Karaoke bo'limi — faqat MUSIC uchun */}
                            {kind === "MUSIC" && (
                                <div className="rounded-xl overflow-hidden" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.25)" }}>
                                    <button type="button" onClick={() => setShowKaraoke(v => !v)}
                                        className="w-full flex items-center gap-2 p-3 text-left">
                                        <Mic2 className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-white">Karaoke va musiqa klipi</p>
                                            <p className="text-[10px]" style={{ color: "rgba(180,150,220,0.75)" }}>
                                                Klip video, instrumental (vokalsiz), lyrics timing (LRC)
                                            </p>
                                        </div>
                                        <span className="text-xs" style={{ color: "#8B5CF6" }}>{showKaraoke ? "−" : "+"}</span>
                                    </button>
                                    {showKaraoke && (
                                        <div className="px-3 pb-3 pt-1 space-y-3" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
                                            {/* Musiqa klipi (video) */}
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide mb-1.5" style={{ color: "rgba(180,150,220,0.85)" }}>
                                                    <VideoIcon className="w-3 h-3 inline mr-1" />Musiqa klipi (video)
                                                </p>
                                                {videoUrl ? (
                                                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(139,92,246,0.10)" }}>
                                                        <VideoIcon className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                                                        <span className="text-[11px] font-bold text-white flex-1 truncate">Yuklandi ({videoOrient === "VERTICAL" ? "9:16" : "16:9"})</span>
                                                        <button onClick={() => setVideoUrl(null)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                                    </div>
                                                ) : (
                                                    <label className="w-full flex items-center gap-2 p-2 rounded-lg cursor-pointer text-[11px] font-bold"
                                                        style={{ background: "rgba(139,92,246,0.08)", border: "1px dashed rgba(139,92,246,0.30)", color: "rgba(180,150,220,0.85)" }}>
                                                        {videoBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <VideoIcon className="w-3.5 h-3.5" />}
                                                        {videoBusy ? "Yuklanmoqda..." : "Klip tanlash (MP4/WebM)"}
                                                        <input type="file" accept="video/*" onChange={e => pickVideo(e.target.files)} disabled={videoBusy} className="sr-only" />
                                                    </label>
                                                )}
                                            </div>

                                            {/* Instrumental (vokalsiz) */}
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide mb-1.5" style={{ color: "rgba(180,150,220,0.85)" }}>
                                                    <Music2 className="w-3 h-3 inline mr-1" />Vokalsiz variant (karaoke uchun)
                                                </p>
                                                {instrumentalUrl ? (
                                                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(139,92,246,0.10)" }}>
                                                        <Music2 className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                                                        <span className="text-[11px] font-bold text-white flex-1 truncate">Instrumental yuklandi</span>
                                                        <button onClick={() => setInstrumentalUrl(null)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                                    </div>
                                                ) : (
                                                    <label className="w-full flex items-center gap-2 p-2 rounded-lg cursor-pointer text-[11px] font-bold"
                                                        style={{ background: "rgba(139,92,246,0.08)", border: "1px dashed rgba(139,92,246,0.30)", color: "rgba(180,150,220,0.85)" }}>
                                                        {instrBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Music2 className="w-3.5 h-3.5" />}
                                                        {instrBusy ? "Yuklanmoqda..." : "Instrumental audio tanlash"}
                                                        <input type="file" accept="audio/*" onChange={e => pickInstrumental(e.target.files)} disabled={instrBusy} className="sr-only" />
                                                    </label>
                                                )}
                                            </div>

                                            {/* Lyrics (LRC format) */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <p className="text-[10px] font-black uppercase tracking-wide flex-1" style={{ color: "rgba(180,150,220,0.85)" }}>
                                                        <FileText className="w-3 h-3 inline mr-1" />Lyrics (LRC formatida)
                                                    </p>
                                                    <label className="text-[10px] font-bold cursor-pointer" style={{ color: "#8B5CF6" }}>
                                                        Fayldan yuklash
                                                        <input type="file" accept=".lrc,text/plain" onChange={e => pickLrcFile(e.target.files)} className="sr-only" />
                                                    </label>
                                                </div>
                                                <textarea value={lyricsLrc} onChange={e => setLyricsLrc(e.target.value.slice(0, 200_000))}
                                                    placeholder={"[00:12.50] Birinchi qator matni\n[00:15.20] Ikkinchi qator\n[00:18.00] ..."}
                                                    rows={5}
                                                    className="w-full px-3 py-2 rounded-lg text-[11px] font-mono text-white outline-none resize-y"
                                                    style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(139,92,246,0.22)", caretColor: "#8B5CF6" }} />
                                                <p className="text-[9px] mt-1" style={{ color: "rgba(180,150,220,0.55)" }}>
                                                    Format: <span className="font-mono">[mm:ss.xx] matn</span> — har qatorda vaqt tegi va matn
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {err && <p className="text-xs text-red-400 font-bold">{err}</p>}

                            <button onClick={publish} disabled={posting || !title.trim() || coverBusy}
                                className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Joylash</>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
