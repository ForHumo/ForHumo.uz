"use client";

// Guruh voice chat pill — chat header ostidan yopishqoq banner sifatida ko'rinadi
// (agar faol voice chat bo'lsa). OWNER/ADMIN "Boshlash" tugmasini ko'radi.

import { useEffect, useState } from "react";
import { Mic, Phone, PhoneOff, Loader2, Radio } from "lucide-react";

type Active = {
    id: string; roomName: string; title: string | null;
    startedAt: string; participantCount: number; hostId: string;
};

export function NxGroupVoicePill({
    channelId, canStart, canEnd,
}: {
    channelId: string;
    canStart: boolean;
    canEnd: boolean;
}) {
    const [active, setActive] = useState<Active | null>(null);
    const [busy, setBusy] = useState(false);

    const load = () => fetch(`/api/nexus/channels/${channelId}/voice-chat`)
        .then(r => r.ok ? r.json() : { active: null })
        .then(d => setActive(d.active))
        .catch(() => {});

    useEffect(() => {
        load();
        const iv = setInterval(load, 15_000);
        return () => clearInterval(iv);
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [channelId]);

    const start = async () => {
        setBusy(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/voice-chat`, { method: "POST" });
            if (r.ok) load();
            else {
                const d = await r.json().catch(() => ({}));
                alert(d.error || "Voice chat yaratib bo'lmadi");
            }
        } finally { setBusy(false); }
    };
    const end = async () => {
        if (!confirm("Voice chat tugatilsinmi?")) return;
        setBusy(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/voice-chat`, { method: "DELETE" });
            if (r.ok) { setActive(null); }
        } finally { setBusy(false); }
    };

    // Faol voice chat bor
    if (active) {
        return (
            <div className="mx-2 mb-2 px-3 py-2 rounded-2xl flex items-center gap-2"
                style={{ background: "linear-gradient(90deg,rgba(43,62,232,0.15),rgba(0,206,200,0.15))", border: "1px solid rgba(0,206,200,0.35)" }}>
                <div className="relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,206,200,0.25)" }}>
                    <Radio className="w-4 h-4" style={{ color: "#00CEC8" }} />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping" style={{ background: "#FF3250" }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white flex items-center gap-1.5">
                        Voice chat faol
                        <span className="text-[10px] font-normal" style={{ color: "rgba(220,230,255,0.7)" }}>
                            · {active.participantCount} kishi
                        </span>
                    </p>
                    {active.title && (
                        <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.85)" }}>{active.title}</p>
                    )}
                </div>
                <a href={`/nexus/group-call?room=${active.roomName}`}
                    target="_blank" rel="noopener"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Phone className="w-3.5 h-3.5" /> Qo&apos;shilish
                </a>
                {canEnd && (
                    <button onClick={end} disabled={busy}
                        title="Tugatish"
                        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-50"
                        style={{ background: "rgba(255,80,90,0.15)", border: "1px solid rgba(255,80,90,0.3)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                            : <PhoneOff className="w-3.5 h-3.5" style={{ color: "#FF505A" }} />}
                    </button>
                )}
            </div>
        );
    }

    // Faol yo'q — OWNER/ADMIN "Boshlash" ko'radi
    if (canStart) {
        return (
            <div className="mx-2 mb-2">
                <button onClick={start} disabled={busy}
                    className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition disabled:opacity-60"
                    style={{ background: "rgba(43,62,232,0.10)", border: "1px dashed rgba(0,206,200,0.35)", color: "#00CEC8" }}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><Mic className="w-3.5 h-3.5" /> Voice chat boshlash</>}
                </button>
            </div>
        );
    }
    return null;
}
