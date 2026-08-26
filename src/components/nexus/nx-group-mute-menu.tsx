"use client";

// Guruh/kanal uchun mute menyusi — 1s/8s/1kun/doimiy/o'chirilgan.
// Header'dagi Bell tugma ostida ochiladi.

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

const OPTIONS: Array<{ key: string; label: string }> = [
    { key: "1h", label: "1 soat" },
    { key: "8h", label: "8 soat" },
    { key: "1d", label: "1 kun" },
    { key: "forever", label: "Doimiy" },
];

export function NxGroupMuteButton({ channelId }: { channelId: string }) {
    const [mutedUntil, setMutedUntil] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch(`/api/nexus/channels/${channelId}/mute`)
            .then(r => r.ok ? r.json() : { mutedUntil: null })
            .then(d => setMutedUntil(d.mutedUntil));
    }, [channelId]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener("click", onClick);
        return () => window.removeEventListener("click", onClick);
    }, [open]);

    const isMuted = mutedUntil && new Date(mutedUntil).getTime() > Date.now();

    const setMute = async (duration: string) => {
        setBusy(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/mute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ duration }),
            });
            if (r.ok) {
                const d = await r.json();
                setMutedUntil(d.mutedUntil);
            }
        } finally {
            setBusy(false);
            setOpen(false);
        }
    };

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen(v => !v)} disabled={busy}
                title={isMuted ? "Xabarnoma o'chirilgan" : "Xabarnoma yoqilgan"}
                className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50"
                style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                    : isMuted ? <BellOff className="w-4 h-4" style={{ color: "#FFC107" }} />
                        : <Bell className="w-4 h-4 text-white" />}
            </button>

            {open && (
                <div className="absolute right-0 top-11 min-w-[180px] z-[400] py-1 rounded-2xl overflow-hidden"
                    style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)", boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}>
                    <div className="px-3 py-2 text-[10px] uppercase tracking-widest"
                        style={{ color: "rgba(140,160,210,0.7)", borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                        Ovozsizlantirish
                    </div>
                    {OPTIONS.map(o => (
                        <button key={o.key} onClick={() => setMute(o.key)}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5">
                            {o.label}
                        </button>
                    ))}
                    {isMuted && (
                        <>
                            <div style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }} />
                            <button onClick={() => setMute("off")}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                                style={{ color: "#00CEC8" }}>
                                Xabarnoma yoqish
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
