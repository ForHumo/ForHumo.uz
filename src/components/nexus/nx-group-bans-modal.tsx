"use client";

// Ban ro'yxati — kim guruhdan bloklangan (OWNER/ADMIN ko'radi).
// Bekor qilish tugmasi ham bor.

import { useEffect, useState } from "react";
import { X, Loader2, ShieldOff, ShieldCheck } from "lucide-react";

type Ban = {
    id: string;
    profileId: string;
    reason: string | null;
    createdAt: string;
    profile: { id: string; name: string | null; username: string | null; image: string | null } | null;
    bannedBy: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
    return `${Math.floor(s / 86400)} kun oldin`;
}

export function NxGroupBansModal({
    open, channelId, onClose,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
}) {
    const [bans, setBans] = useState<Ban[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/bans`)
            .then(r => r.ok ? r.json() : { bans: [] })
            .then(d => setBans(d.bans ?? []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, channelId]);

    const unban = async (profileId: string) => {
        if (!confirm("Ban'ni bekor qilasizmi? A'zo qayta kirishi mumkin.")) return;
        setBusy(profileId);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/bans?profileId=${profileId}`, { method: "DELETE" });
            if (r.ok) setBans(prev => prev.filter(b => b.profileId !== profileId));
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
                        <ShieldOff className="w-4 h-4" style={{ color: "#FF505A" }} /> Bloklangan a&apos;zolar · {bans.length}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : bans.length === 0 ? (
                        <p className="py-8 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>Bloklangan a&apos;zo yo&apos;q</p>
                    ) : bans.map(b => (
                        <div key={b.id} className="flex items-start gap-3 rounded-2xl px-3 py-2.5 mb-1"
                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(255,80,90,0.15)" }}>
                            <img src={b.profile?.image ?? "/logos/forhumo.png"} alt=""
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                    {b.profile?.name ?? b.profile?.username ?? "?"}
                                </p>
                                {b.profile?.username && (
                                    <p className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>@{b.profile.username}</p>
                                )}
                                {b.reason && (
                                    <p className="text-[11px] italic mt-0.5" style={{ color: "rgba(200,215,245,0.8)" }}>{b.reason}</p>
                                )}
                                <p className="text-[10px] mt-0.5" style={{ color: "rgba(140,160,210,0.6)" }}>
                                    {timeAgo(b.createdAt)}
                                    {b.bannedBy && ` · ${b.bannedBy.name ?? b.bannedBy.username ?? ""}`}
                                </p>
                            </div>
                            <button disabled={busy === b.profileId} onClick={() => unban(b.profileId)}
                                title="Blokdan chiqarish"
                                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                                style={{ background: "rgba(0,206,200,0.10)", border: "1px solid rgba(0,206,200,0.3)" }}>
                                {busy === b.profileId ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    : <ShieldCheck className="w-4 h-4" style={{ color: "#00CEC8" }} />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
