"use client";

// Xabarni ko'rgan foydalanuvchilar (owner/admin) — so'nggi 50, teskari xronologik.

import { useEffect, useState } from "react";
import { X, Loader2, Eye } from "lucide-react";

type Viewer = {
    id: string; name: string | null; username: string | null; image: string | null;
    viewedAt: string;
};

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    return `${Math.floor(s / 86400)} kun`;
}

export function NxChannelViewersModal({
    open, channelId, messageId, onClose,
}: {
    open: boolean;
    channelId: string;
    messageId: string;
    onClose: () => void;
}) {
    const [total, setTotal] = useState(0);
    const [viewers, setViewers] = useState<Viewer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/messages/${messageId}/viewers`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d) { setTotal(d.total ?? 0); setViewers(d.viewers ?? []); }
            })
            .finally(() => setLoading(false));
    }, [open, channelId, messageId]);

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
                        <Eye className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Ko&apos;rganlar · {total}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12 flex-1"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                ) : viewers.length === 0 ? (
                    <div className="text-center py-12">
                        <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "#00CEC8" }} />
                        <p className="text-sm" style={{ color: "rgba(160,176,224,0.7)" }}>Hali hech kim ko&apos;rmagan</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                            <p className="text-[10px] uppercase tracking-widest px-3 mb-2"
                                style={{ color: "rgba(160,176,224,0.7)" }}>
                                So&apos;nggi {viewers.length} · Umumiy {total}
                            </p>
                            {viewers.map(v => (
                                <div key={v.id} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1"
                                    style={{ background: "rgba(11,18,40,0.55)" }}>
                                    <img src={v.image ?? "/logos/forhumo.png"} alt=""
                                        className="w-8 h-8 rounded-full object-cover"
                                        style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{v.name ?? v.username ?? "?"}</p>
                                        {v.username && <p className="text-[10px]" style={{ color: "rgba(120,140,185,0.7)" }}>@{v.username}</p>}
                                    </div>
                                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(140,160,210,0.7)" }}>
                                        {timeAgo(v.viewedAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
