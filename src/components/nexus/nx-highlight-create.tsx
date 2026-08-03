"use client";

// Yangi highlight yaratish modali — o'z stories/highlightlaridan tanlash.
// Faqat o'z hisobiga tegishli.

import { useState, useEffect } from "react";
import { X, Loader2, Check, Star, Plus } from "lucide-react";

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

interface OwnStory {
    id: string; mediaUrl: string; mediaType: string; caption: string | null; createdAt: string;
    slides: { mediaUrl: string; mediaType: string }[];
}

const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);

export function NxHighlightCreate({ onClose, onCreated }: Props) {
    const [title, setTitle] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [stories, setStories] = useState<OwnStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        // Meniki bo'lgan yagona guruh — o'z stories'lar
        fetch("/api/nexus/stories")
            .then(r => r.json())
            .then(d => {
                const myGroup = (d.groups ?? []).find((g: { isMe: boolean }) => g.isMe);
                setStories(myGroup?.stories ?? []);
            })
            .finally(() => setLoading(false));
    }, []);

    function toggle(sid: string, previewUrl: string) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(sid)) next.delete(sid);
            else next.add(sid);
            return next;
        });
        // Muqova avto: birinchi tanlangan slide
        if (!coverUrl && previewUrl && !isVid(previewUrl)) setCoverUrl(previewUrl);
    }

    async function create() {
        if (!title.trim() || selected.size === 0 || busy) return;
        setBusy(true);
        try {
            const res = await fetch("/api/nexus/highlights", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    coverUrl: coverUrl || undefined,
                    storyIds: [...selected],
                }),
            });
            if (res.ok) onCreated();
            else {
                const d = await res.json().catch(() => ({}));
                alert(d.error || "Xato");
            }
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: "rgba(11,16,40,0.98)", border: "1px solid rgba(43,62,232,0.22)", maxHeight: "90vh" }}>

                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <Star className="w-5 h-5" style={{ color: "#EAB308" }} />
                    <p className="text-base font-black text-white flex-1">Yangi highlight</p>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 130px)", scrollbarWidth: "none" }}>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(140,160,210,0.75)" }}>Sarlavha</label>
                        <input value={title} onChange={e => setTitle(e.target.value.slice(0, 60))}
                            placeholder="Sayohatlar, Ishlar, Retseptlar..."
                            className="w-full px-3.5 py-3 rounded-xl text-sm text-white outline-none"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(140,160,210,0.75)" }}>
                            Story'lar tanlang ({selected.size} tanlandi)
                        </label>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#00CEC8" }} /></div>
                        ) : stories.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm font-bold text-white/70">Aktiv story'lar yo'q</p>
                                <p className="text-[11px] mt-1" style={{ color: "rgba(140,160,210,0.65)" }}>Avval story qo'shing, keyin highlight yarating</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                                {stories.map(s => {
                                    const previewUrl = s.slides[0]?.mediaUrl || s.mediaUrl;
                                    const isSelected = selected.has(s.id);
                                    return (
                                        <button key={s.id} onClick={() => toggle(s.id, previewUrl)}
                                            className="relative aspect-[9/16] rounded-lg overflow-hidden"
                                            style={{ border: isSelected ? "3px solid #EAB308" : "1px solid rgba(255,255,255,0.15)" }}>
                                            {isVid(previewUrl) ? (
                                                <video src={previewUrl} muted className="w-full h-full object-cover" />
                                            ) : previewUrl ? (
                                                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-bold px-1 text-center" style={{ background: "#2B3EE8" }}>
                                                    {s.caption?.slice(0, 20) || "Aa"}
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#EAB308" }}>
                                                    <Check className="w-3 h-3 text-black" strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-5 py-3 flex gap-2" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                    <button onClick={onClose} disabled={busy}
                        className="flex-1 px-4 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: "rgba(43,62,232,0.10)" }}>
                        Bekor
                    </button>
                    <button onClick={create} disabled={busy || !title.trim() || selected.size === 0}
                        className="flex-1 px-4 py-3 rounded-xl text-xs font-black text-black disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: "#EAB308" }}>
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Yaratish
                    </button>
                </div>
            </div>
        </div>
    );
}
