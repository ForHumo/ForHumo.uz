"use client";

// Yopiq guruh kirish so'rovlari — OWNER/ADMIN uchun modal.
// GET /channels/[id]/join-requests → PATCH { requestId, decision }

import { useEffect, useState } from "react";
import { X, Loader2, Check, XCircle, UserPlus } from "lucide-react";

type JoinReq = {
    id: string; profileId: string; message: string | null; createdAt: string;
    profile: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

export function NxGroupJoinRequestsModal({
    open, channelId, onClose, onChange,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
    onChange?: () => void;
}) {
    const [items, setItems] = useState<JoinReq[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/join-requests`)
            .then(r => r.ok ? r.json() : { requests: [] })
            .then(d => setItems(d.requests ?? []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, channelId]);

    const decide = async (id: string, decision: "APPROVE" | "REJECT") => {
        setBusy(id);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/join-requests`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, decision }),
            });
            if (r.ok) {
                setItems(prev => prev.filter(x => x.id !== id));
                onChange?.();
            }
        } finally { setBusy(null); }
    };

    if (!open) return null;
    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[420px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <UserPlus className="w-4 h-4" style={{ color: "#00CEC8" }} /> Kirish so&apos;rovlari · {items.length}
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
                        <p className="py-8 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>Kutayotgan so&apos;rov yo&apos;q</p>
                    ) : items.map(r => (
                        <div key={r.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 mb-1"
                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                            <img src={r.profile?.image ?? "/logos/forhumo.png"} alt=""
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                    {r.profile?.name ?? r.profile?.username ?? "?"}
                                </p>
                                {r.profile?.username && <p className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>@{r.profile.username}</p>}
                            </div>
                            <div className="flex gap-1">
                                <button disabled={busy === r.id} onClick={() => decide(r.id, "APPROVE")}
                                    title="Qabul qilish"
                                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                                    style={{ background: "rgba(0,206,200,0.15)", border: "1px solid rgba(0,206,200,0.3)" }}>
                                    <Check className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                </button>
                                <button disabled={busy === r.id} onClick={() => decide(r.id, "REJECT")}
                                    title="Rad etish"
                                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                                    style={{ background: "rgba(255,80,90,0.15)", border: "1px solid rgba(255,80,90,0.3)" }}>
                                    <XCircle className="w-4 h-4" style={{ color: "#FF505A" }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
