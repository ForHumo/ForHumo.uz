"use client";

// Kelayotgan (scheduled) postlar draft-box — owner/admin uchun.
// Har elementda: matn/media preview + rejalashtirish vaqti + o'chirish tugma.

import { useEffect, useState } from "react";
import { X, Loader2, Calendar, Trash2, ImageIcon, Video, Mic, BarChart2, MapPin, User } from "lucide-react";

type Item = {
    id: string;
    text: string | null;
    hasMedia: boolean;
    mediaCount: number;
    firstMedia: string | null;
    mediaType: string | null;
    isPoll: boolean;
    pollQuestion: string | null;
    scheduledFor: string;
    createdAt: string;
    sender: { name: string | null; username: string | null; image: string | null } | null;
};

function timeUntil(iso: string): string {
    const t = new Date(iso).getTime();
    const now = Date.now();
    const s = Math.max(0, Math.floor((t - now) / 1000));
    if (s < 60) return `${s} sek`;
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    return `${Math.floor(s / 86400)} kun`;
}

function MediaIcon({ type }: { type: string | null }) {
    if (type === "video" || type === "video-circle") return <Video className="w-4 h-4" />;
    if (type === "audio") return <Mic className="w-4 h-4" />;
    if (type === "location") return <MapPin className="w-4 h-4" />;
    if (type === "contact") return <User className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
}

export function NxChannelScheduledModal({
    open, channelId, onClose,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
}) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/scheduled`);
            if (r.ok) {
                const d = await r.json();
                setItems(d.items ?? []);
            }
        } finally { setLoading(false); }
    }

    useEffect(() => {
        if (!open) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, channelId]);

    async function remove(id: string) {
        if (!confirm("Rejadagi postni o'chirasizmi?")) return;
        setDeletingId(id);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/scheduled?msgId=${id}`, { method: "DELETE" });
            if (r.ok) setItems(prev => prev.filter(i => i.id !== id));
        } finally { setDeletingId(null); }
    }

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4" style={{ color: "#00CEC8" }} /> Rejadagi postlar · {items.length}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "#00CEC8" }} />
                            <p className="text-sm" style={{ color: "rgba(160,176,224,0.7)" }}>
                                Rejalashtirilgan post yo&apos;q
                            </p>
                            <p className="text-[11px] mt-1" style={{ color: "rgba(120,140,185,0.6)" }}>
                                Yangi post yozayotganda &quot;Jadval&quot; opsiyasi bilan qo&apos;shing
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map(item => (
                                <div key={item.id} className="p-3 rounded-xl"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                                            style={{ background: "rgba(0,206,200,0.14)", color: "#00CEC8" }}>
                                            <Calendar className="w-3 h-3" />
                                            {new Date(item.scheduledFor).toLocaleString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        <span className="text-[10px]" style={{ color: "rgba(160,176,224,0.7)" }}>
                                            {timeUntil(item.scheduledFor)} qoldi
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        {item.firstMedia && (item.mediaType === "image" || !item.mediaType) ? (
                                            <img src={item.firstMedia} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.10)" }} />
                                        ) : item.hasMedia ? (
                                            <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.14)", color: "#00CEC8" }}>
                                                <MediaIcon type={item.mediaType} />
                                            </div>
                                        ) : item.isPoll ? (
                                            <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.14)", color: "#00CEC8" }}>
                                                <BarChart2 className="w-4 h-4" />
                                            </div>
                                        ) : null}
                                        <div className="flex-1 min-w-0">
                                            {item.text && (
                                                <p className="text-sm text-white line-clamp-3">{item.text}</p>
                                            )}
                                            {!item.text && item.isPoll && (
                                                <p className="text-sm text-white font-bold">
                                                    So&apos;rovnoma: <span className="font-normal">{item.pollQuestion}</span>
                                                </p>
                                            )}
                                            {!item.text && !item.isPoll && item.hasMedia && (
                                                <p className="text-sm text-white">
                                                    {item.mediaType === "video" ? "Video" : item.mediaType === "audio" ? "Ovoz" : "Media"}
                                                    {item.mediaCount > 1 && ` · ${item.mediaCount}`}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => remove(item.id)} disabled={deletingId === item.id}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}
                                            title="O'chirish">
                                            {deletingId === item.id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#EF4444" }} />
                                                : <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
