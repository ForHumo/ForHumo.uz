"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { useNxPlayer } from "./nx-player-ctx";
import { X, ImagePlus, Loader2, Send, Trash2 } from "lucide-react";

const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);

export function NxStoryCreate() {
    const { storyCreateOpen, setStoryCreateOpen } = useNxPlayer();
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    if (!storyCreateOpen) return null;

    function close() {
        setMediaUrl(null); setCaption(""); setUploading(false); setPosting(false);
        setStoryCreateOpen(false);
    }

    async function pick(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const blob = await upload(`nexus/story/${Date.now()}-${safe}`, file, {
                access: "public", handleUploadUrl: "/api/market/upload/client-token",
            });
            setMediaUrl(blob.url);
        } catch { /* ignore */ } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    async function publish() {
        if (!mediaUrl || posting) return;
        setPosting(true);
        try {
            const res = await fetch("/api/nexus/stories", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaUrl, mediaType: isVid(mediaUrl) ? "VIDEO" : "IMAGE", caption }),
            });
            if (res.ok) close();
        } finally { setPosting(false); }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.92)" }} onClick={close}>
            <div onClick={e => e.stopPropagation()}
                className="relative flex flex-col overflow-hidden rounded-2xl"
                style={{ width: "min(380px, 95vw)", height: "min(680px, 90vh)", background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)" }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-sm font-black text-white">Hikoya qo&apos;shish</h3>
                    <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Body */}
                {!mediaUrl ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                        <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="flex flex-col items-center justify-center gap-3 w-full h-full rounded-2xl border-2 border-dashed"
                            style={{ borderColor: "rgba(43,62,232,0.35)", background: "rgba(43,62,232,0.05)" }}>
                            {uploading ? (
                                <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#00CEC8" }} />
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <ImagePlus className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-white">Rasm yoki video tanlang</span>
                                    <span className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>24 soatdan keyin o&apos;chadi</span>
                                </>
                            )}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={e => pick(e.target.files)} className="hidden" />
                    </div>
                ) : (
                    <div className="relative flex-1 overflow-hidden">
                        {isVid(mediaUrl)
                            ? <video src={mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            : <img src={mediaUrl} alt="" className="w-full h-full object-cover" />}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.75) 100%)" }} />

                        {/* Qayta tanlash */}
                        <button onClick={() => setMediaUrl(null)}
                            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.5)" }}>
                            <Trash2 className="w-4 h-4 text-white" />
                        </button>

                        {/* Caption + joylash */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                            <input value={caption} onChange={e => setCaption(e.target.value.slice(0, 300))}
                                placeholder="Izoh (ixtiyoriy)..."
                                className="flex-1 h-10 rounded-full px-4 text-sm text-white outline-none"
                                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.30)", caretColor: "#00CEC8" }} />
                            <button onClick={publish} disabled={posting}
                                className="w-10 h-10 flex items-center justify-center rounded-full text-white flex-shrink-0 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
