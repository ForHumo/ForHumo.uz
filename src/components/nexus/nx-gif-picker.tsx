"use client";

// Giphy search modal — composer 'GIF' tugmasidan chaqiriladi.
// Tanlangan GIF onPick(url) orqali yuboriladi (video-message emas — mediaType='gif').

import { useEffect, useState } from "react";
import { X, Search, Loader2, Sparkles } from "lucide-react";

interface Gif {
    id: string;
    title: string;
    url_mp4: string | null;
    url_gif: string | null;
    preview: string | null;
    width: number;
    height: number;
}

interface Props {
    onClose: () => void;
    onPick: (g: { url: string; preview: string | null; width: number; height: number }) => void;
}

export function NxGifPicker({ onClose, onPick }: Props) {
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<Gif[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Trending on mount
    useEffect(() => {
        setBusy(true);
        fetch("/api/nexus/gif?trending=1&limit=24", { cache: "no-store" })
            .then(async r => {
                const d = await r.json();
                if (!r.ok) setErr(d?.error ?? "Xatolik");
                setItems(d.gifs ?? []);
            })
            .catch(e => setErr(e instanceof Error ? e.message : "Xatolik"))
            .finally(() => setBusy(false));
    }, []);

    // Debounced search
    useEffect(() => {
        const q = query.trim();
        if (!q) return;
        const t = setTimeout(async () => {
            setBusy(true);
            setErr(null);
            try {
                const r = await fetch(`/api/nexus/gif?q=${encodeURIComponent(q)}&limit=24`, { cache: "no-store" });
                const d = await r.json();
                if (!r.ok) setErr(d?.error ?? "Xatolik");
                setItems(d.gifs ?? []);
            } catch (e) {
                setErr(e instanceof Error ? e.message : "Xatolik");
            } finally { setBusy(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
            onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "80vh" }}>
                {/* Header */}
                <div className="p-3 flex items-center gap-2 border-b"
                    style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                    <div className="flex-1 flex items-center gap-2 rounded-lg px-3"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.55)" }} />
                        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="GIF qidirish..."
                            className="flex-1 h-9 bg-transparent text-white text-sm focus:outline-none" />
                        {busy && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#00CEC8" }} />}
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-lg"
                        style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto nx-scrollbar p-2">
                    {!query.trim() && !busy && items.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                            <Sparkles className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.75)" }}>
                                Trending
                            </p>
                        </div>
                    )}
                    {err && (
                        <p className="text-center py-8 text-xs"
                            style={{ color: "#EF4444" }}>
                            {err.includes("kaliti") ? "Giphy sozlanmagan (GIPHY_API_KEY env yo'q)" : err}
                        </p>
                    )}
                    {!busy && !err && items.length === 0 && query.trim() && (
                        <p className="text-center py-8 text-xs" style={{ color: "rgba(140,160,210,0.60)" }}>
                            Hech narsa topilmadi
                        </p>
                    )}
                    {items.length > 0 && (
                        <div className="grid grid-cols-3 gap-1">
                            {items.map(g => (
                                <button key={g.id}
                                    onClick={() => {
                                        // MP4 tezroq va kichikroq — birinchi tanlaymiz
                                        const url = g.url_mp4 ?? g.url_gif;
                                        if (!url) return;
                                        onPick({
                                            url,
                                            preview: g.preview,
                                            width: g.width,
                                            height: g.height,
                                        });
                                    }}
                                    className="aspect-square rounded overflow-hidden bg-black active:scale-95 transition-transform"
                                    title={g.title}>
                                    {g.preview && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={g.preview} alt={g.title} loading="lazy"
                                            className="w-full h-full object-cover" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer — Powered by Giphy (majburiy) */}
                <div className="p-2 border-t text-center text-[10px]"
                    style={{ borderColor: "rgba(43,62,232,0.14)", color: "rgba(140,160,210,0.55)" }}>
                    GIPHY orqali
                </div>
            </div>
        </div>
    );
}
