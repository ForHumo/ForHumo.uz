"use client";

// Guruh stories — chat header ostida gorizontal qator. Bosilsa viewer ochiladi.

import { useEffect, useState, useRef } from "react";
import { X, Loader2, Camera, Upload, Play } from "lucide-react";

type Story = {
    id: string; mediaUrl: string; mediaType: string; caption: string | null;
    createdAt: string; expiresAt: string;
    author: { id: string; name: string | null; username: string | null; image: string | null } | null;
    seen: boolean;
};

export function NxGroupStoriesBar({
    channelId, isMember,
}: {
    channelId: string;
    isMember: boolean;
}) {
    const [stories, setStories] = useState<Story[]>([]);
    const [viewerIdx, setViewerIdx] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    const load = () => fetch(`/api/nexus/channels/${channelId}/stories`)
        .then(r => r.ok ? r.json() : { stories: [] })
        .then(d => setStories(d.stories ?? []))
        .catch(() => {});

    useEffect(() => {
        if (!isMember) return;
        load();
        const iv = setInterval(load, 60_000);
        return () => clearInterval(iv);
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [channelId, isMember]);

    if (!isMember) return null;
    if (stories.length === 0 && !createOpen) {
        return (
            <div className="mx-2 mb-2 flex items-center gap-2 overflow-x-auto py-1"
                style={{ scrollbarWidth: "none" }}>
                <button onClick={() => setCreateOpen(true)}
                    className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[60px]">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px dashed rgba(0,206,200,0.35)" }}>
                        <Camera className="w-5 h-5" style={{ color: "#00CEC8" }} />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: "rgba(180,195,235,0.85)" }}>Hikoya</span>
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="mx-2 mb-2 flex items-center gap-2 overflow-x-auto py-1"
                style={{ scrollbarWidth: "none" }}>
                {/* Yaratish */}
                <button onClick={() => setCreateOpen(true)}
                    className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[60px]">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px dashed rgba(0,206,200,0.35)" }}>
                        <Camera className="w-5 h-5" style={{ color: "#00CEC8" }} />
                    </div>
                    <span className="text-[10px] font-bold truncate max-w-[60px]" style={{ color: "rgba(180,195,235,0.85)" }}>Siz</span>
                </button>
                {stories.map((s, i) => (
                    <button key={s.id} onClick={() => setViewerIdx(i)}
                        className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[60px]">
                        <div className="w-14 h-14 rounded-full p-0.5"
                            style={{
                                background: s.seen
                                    ? "rgba(120,140,185,0.35)"
                                    : "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            }}>
                            <img src={s.author?.image ?? "/logos/forhumo.png"} alt=""
                                className="w-full h-full rounded-full object-cover"
                                style={{ border: "2px solid rgba(8,12,32,0.99)" }} />
                        </div>
                        <span className="text-[10px] truncate max-w-[60px]" style={{ color: "rgba(180,195,235,0.85)" }}>
                            {s.author?.name?.split(" ")[0] ?? s.author?.username ?? "?"}
                        </span>
                    </button>
                ))}
            </div>

            {viewerIdx !== null && (
                <NxGroupStoryViewer stories={stories} startIdx={viewerIdx} channelId={channelId}
                    onClose={() => { setViewerIdx(null); load(); }} />
            )}
            {createOpen && (
                <NxGroupStoryCreate channelId={channelId}
                    onClose={() => setCreateOpen(false)}
                    onCreated={() => { setCreateOpen(false); load(); }} />
            )}
        </>
    );
}

function NxGroupStoryViewer({
    stories, startIdx, channelId, onClose,
}: {
    stories: Story[]; startIdx: number; channelId: string;
    onClose: () => void;
}) {
    const [idx, setIdx] = useState(startIdx);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const IMAGE_DURATION = 5000;

    const current = stories[idx];

    useEffect(() => {
        if (!current) return;
        // View POST
        fetch(`/api/nexus/channels/${channelId}/stories/${current.id}/view`, { method: "POST" }).catch(() => {});
        setProgress(0);
        if (current.mediaType === "image") {
            const start = Date.now();
            timerRef.current = setInterval(() => {
                const elapsed = Date.now() - start;
                if (elapsed >= IMAGE_DURATION) {
                    if (idx < stories.length - 1) setIdx(idx + 1);
                    else onClose();
                } else {
                    setProgress((elapsed / IMAGE_DURATION) * 100);
                }
            }, 50);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [idx, current?.id]);

    if (!current) return null;

    return (
        <div className="fixed inset-0 z-[500] bg-black flex flex-col" onClick={onClose}>
            <div className="flex-shrink-0 flex gap-1 p-2">
                {stories.map((_, i) => (
                    <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.2)" }}>
                        <div className="h-full transition-all"
                            style={{
                                width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
                                background: "white",
                            }} />
                    </div>
                ))}
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-white">
                <img src={current.author?.image ?? "/logos/forhumo.png"} alt="" className="w-7 h-7 rounded-full object-cover" />
                <p className="text-sm font-bold flex-1 truncate">{current.author?.name ?? current.author?.username}</p>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.15)" }}>
                    <X className="w-4 h-4 text-white" />
                </button>
            </div>
            <div className="flex-1 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
                {current.mediaType === "image" ? (
                    <img src={current.mediaUrl} alt="" className="max-w-full max-h-full object-contain" />
                ) : (
                    <video src={current.mediaUrl} controls autoPlay playsInline
                        onEnded={() => { if (idx < stories.length - 1) setIdx(idx + 1); else onClose(); }}
                        className="max-w-full max-h-full object-contain" />
                )}
                {/* Tap zones */}
                <button className="absolute inset-y-0 left-0 w-1/3"
                    onClick={() => { if (idx > 0) setIdx(idx - 1); }} />
                <button className="absolute inset-y-0 right-0 w-1/3"
                    onClick={() => { if (idx < stories.length - 1) setIdx(idx + 1); else onClose(); }} />
            </div>
            {current.caption && (
                <div className="flex-shrink-0 px-4 py-3 text-center text-sm text-white"
                    style={{ background: "linear-gradient(0deg,rgba(0,0,0,0.7),transparent)" }}>
                    {current.caption}
                </div>
            )}
        </div>
    );
}

function NxGroupStoryCreate({
    channelId, onClose, onCreated,
}: {
    channelId: string; onClose: () => void; onCreated: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [caption, setCaption] = useState("");
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const onFile = (f: File) => {
        setFile(f);
        const url = URL.createObjectURL(f);
        setPreview(url);
    };

    const upload = async () => {
        if (!file) return;
        setBusy(true);
        try {
            const { upload: blobUpload } = await import("@vercel/blob/client");
            const res = await blobUpload(`nexus/story/${Date.now()}-${file.name}`, file, {
                access: "public",
                handleUploadUrl: "/api/market/upload/client-token",
            });
            const mediaType = file.type.startsWith("video") ? "video" : "image";
            const r = await fetch(`/api/nexus/channels/${channelId}/stories`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaUrl: res.url, mediaType, caption: caption.trim() || undefined }),
            });
            if (r.ok) onCreated();
            else {
                const d = await r.json().catch(() => ({}));
                alert(d.error || "Xato");
            }
        } finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-[500] bg-black/85 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl overflow-hidden flex flex-col"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)", maxHeight: "90vh" }}>
                <div className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Camera className="w-4 h-4" style={{ color: "#00CEC8" }} /> Yangi hikoya (24 soat)
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                <div className="p-5 flex-1 overflow-y-auto space-y-3">
                    {!preview ? (
                        <label className="block">
                            <input type="file" accept="image/*,video/*" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
                            <div className="border-2 border-dashed rounded-2xl py-16 flex flex-col items-center gap-2 cursor-pointer"
                                style={{ borderColor: "rgba(0,206,200,0.35)" }}>
                                <Upload className="w-8 h-8" style={{ color: "#00CEC8" }} />
                                <p className="text-sm font-bold text-white">Rasm yoki video tanlang</p>
                                <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.7)" }}>24 soatga jonli bo&apos;ladi</p>
                            </div>
                        </label>
                    ) : (
                        <div className="relative rounded-2xl overflow-hidden">
                            {file?.type.startsWith("video") ? (
                                <video src={preview} controls className="w-full aspect-square object-cover" />
                            ) : (
                                <img src={preview} alt="" className="w-full aspect-square object-cover" />
                            )}
                            <button onClick={() => { setFile(null); setPreview(null); }}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(0,0,0,0.6)" }}>
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}
                    {preview && (
                        <textarea value={caption} onChange={e => setCaption(e.target.value)}
                            placeholder="Izoh (ixtiyoriy)..."
                            rows={2} maxLength={500}
                            className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
                            style={{ background: "rgba(11,18,40,0.7)", border: "1px solid rgba(43,62,232,0.22)" }} />
                    )}
                </div>
                {preview && (
                    <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                        <button onClick={upload} disabled={busy}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda...</> : <><Play className="w-4 h-4" /> Hikoya qo&apos;shish</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
