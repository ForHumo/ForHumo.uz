"use client";

// Guruh/kanal pinlangan xabarlar ro'yxati (Telegram uslub).

import { useEffect, useState } from "react";
import { X, Loader2, Pin } from "lucide-react";

type Pinned = {
    id: string; text: string | null; media: string[]; mediaType: string | null;
    createdAt: string; pinnedAt: string;
    author: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

export function NxGroupPinnedList({
    open, channelId, onClose, onJump,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
    onJump?: (messageId: string) => void;
}) {
    const [items, setItems] = useState<Pinned[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/pinned`)
            .then(r => r.ok ? r.json() : { pinned: [] })
            .then(d => setItems(d.pinned ?? []))
            .finally(() => setLoading(false));
    }, [open, channelId]);

    if (!open) return null;
    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Pin className="w-4 h-4" style={{ color: "#00CEC8" }} /> Pinlangan · {items.length}
                    </h3>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} />
                        </div>
                    ) : items.length === 0 ? (
                        <p className="py-8 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>Pinlangan xabar yo&apos;q</p>
                    ) : items.map(m => (
                        <button key={m.id} onClick={() => { onJump?.(m.id); onClose(); }}
                            className="w-full text-left rounded-2xl px-3 py-2.5 mb-1 hover:bg-white/5 transition"
                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                            <div className="flex items-center gap-2 mb-1">
                                {m.author?.image && <img src={m.author.image} alt="" className="w-5 h-5 rounded-full object-cover" />}
                                <p className="text-[11px] font-bold" style={{ color: "#00CEC8" }}>
                                    {m.author?.name ?? m.author?.username ?? "Anonim"}
                                </p>
                            </div>
                            <p className="text-sm text-white line-clamp-2">
                                {m.text ?? (m.mediaType === "location" ? "[joylashuv]"
                                    : m.mediaType === "contact" ? "[kontakt]"
                                    : m.mediaType === "audio" ? "[ovoz]"
                                    : m.mediaType === "video-circle" ? "[video]"
                                    : m.media.length ? "[media]" : "")}
                            </p>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
