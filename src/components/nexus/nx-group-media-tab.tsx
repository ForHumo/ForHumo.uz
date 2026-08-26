"use client";

// Media/Fayl/Havolalar tab (Telegram uslub).
// GET /api/nexus/channels/[id]/media?type=image|video|file|link

import { useEffect, useState } from "react";
import { X, Loader2, Image as ImageIcon, Film, FileText, Link as LinkIcon, ExternalLink } from "lucide-react";

type MediaItem = {
    id: string;
    url: string;
    kind: string;
    mime: string | null;
    name: string | null;
    size: number | null;
    durationMs: number | null;
    createdAt: string;
    senderId: string;
    text?: string | null;
};

const TABS = [
    { key: "image", label: "Media", icon: ImageIcon },
    { key: "video", label: "Video", icon: Film },
    { key: "file", label: "Fayl", icon: FileText },
    { key: "link", label: "Havola", icon: LinkIcon },
] as const;

function formatSize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NxGroupMediaTab({
    open, channelId, onClose,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<typeof TABS[number]["key"]>("image");
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setItems([]);
        fetch(`/api/nexus/channels/${channelId}/media?type=${tab}&limit=50`)
            .then(r => r.ok ? r.json() : { items: [] })
            .then(d => setItems(d.items ?? []))
            .finally(() => setLoading(false));
    }, [open, channelId, tab]);

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white">Ulashilgan kontent</h3>
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-3 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    {TABS.map(t => (
                        <button key={t.key}
                            onClick={() => setTab(t.key)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                            style={tab === t.key
                                ? { background: "rgba(43,62,232,0.18)", color: "#fff" }
                                : { background: "rgba(11,18,40,0.5)", color: "rgba(140,160,210,0.8)" }}>
                            <t.icon className="w-3.5 h-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} />
                        </div>
                    ) : items.length === 0 ? (
                        <p className="py-8 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>Hech narsa yo&apos;q</p>
                    ) : tab === "image" ? (
                        <div className="grid grid-cols-3 gap-1">
                            {items.map((it, i) => (
                                <a key={i} href={it.url} target="_blank" rel="noopener"
                                    className="aspect-square rounded-lg overflow-hidden bg-black/40">
                                    <img src={it.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                </a>
                            ))}
                        </div>
                    ) : tab === "video" ? (
                        <div className="grid grid-cols-2 gap-2">
                            {items.map((it, i) => (
                                <a key={i} href={it.url} target="_blank" rel="noopener"
                                    className="aspect-video rounded-lg overflow-hidden bg-black/40 flex items-center justify-center relative">
                                    <video src={it.url} className="w-full h-full object-cover" preload="metadata" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <Film className="w-8 h-8 text-white/80" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : tab === "file" ? (
                        <div className="space-y-1.5">
                            {items.map((it, i) => (
                                <a key={i} href={it.url} target="_blank" rel="noopener"
                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    <FileText className="w-8 h-8 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{it.name || it.url.split("/").pop()}</p>
                                        {it.size && <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.7)" }}>{formatSize(it.size)}</p>}
                                    </div>
                                    <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.6)" }} />
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {items.map((it, i) => (
                                <a key={i} href={it.url} target="_blank" rel="noopener"
                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    <LinkIcon className="w-5 h-5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                    <p className="text-xs text-white flex-1 truncate">{it.url}</p>
                                    <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.6)" }} />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
