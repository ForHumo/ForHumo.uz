"use client";

// DM 1:1 chaqiruvlar tarixi — so'nggi 30 ta.
// Kind (audio/video) + yo'nalish (kelayotgan/chiquvchi) + status + duration.

import { useEffect, useState } from "react";
import {
    X, Loader2, Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff,
} from "lucide-react";

type CallItem = {
    id: string;
    kind: "AUDIO" | "VIDEO";
    status: "RINGING" | "ACCEPTED" | "REJECTED" | "MISSED" | "ENDED" | "FAILED";
    outgoing: boolean;
    missed: boolean;
    duration: number;
    createdAt: string;
    acceptedAt: string | null;
    endedAt: string | null;
};

function formatDuration(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `${m}:${String(s).padStart(2, "0")}`;
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)} kun`;
    return new Date(iso).toLocaleDateString("uz-UZ");
}

export function NxDmCallHistoryModal({
    open, peerId, peerName, onClose,
}: {
    open: boolean;
    peerId: string;
    peerName: string;
    onClose: () => void;
}) {
    const [items, setItems] = useState<CallItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetch(`/api/nexus/call/history/${peerId}`)
            .then(r => r.ok ? r.json() : { items: [] })
            .then(d => setItems(d.items ?? []))
            .finally(() => setLoading(false));
    }, [open, peerId]);

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Phone className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Chaqiruvlar · {peerName}
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
                            <PhoneOff className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "#00CEC8" }} />
                            <p className="text-sm" style={{ color: "rgba(160,176,224,0.7)" }}>Chaqiruv tarixi yo&apos;q</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {items.map(c => {
                                const isVideo = c.kind === "VIDEO";
                                const Icon = c.missed
                                    ? PhoneMissed
                                    : c.outgoing ? PhoneOutgoing : PhoneIncoming;
                                const iconColor = c.missed ? "#EF4444"
                                    : c.outgoing ? "#00CEC8" : "#10B981";
                                return (
                                    <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                        style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${iconColor}22` }}>
                                            <Icon className="w-4 h-4" style={{ color: iconColor }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                                {isVideo && <Video className="w-3 h-3" style={{ color: "rgba(160,176,224,0.85)" }} />}
                                                {c.missed
                                                    ? (c.outgoing ? "Javob berilmadi" : "O'tkazib yuborilgan")
                                                    : c.outgoing ? "Chiquvchi" : "Kiruvchi"}
                                            </p>
                                            <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.7)" }}>
                                                {timeAgo(c.createdAt)}
                                                {c.duration > 0 && ` · ${formatDuration(c.duration)}`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
