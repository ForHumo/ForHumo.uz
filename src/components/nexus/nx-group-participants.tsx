"use client";

// Guruh chaqiruv ishtirokchilar ro'yxati + host boshqaruvi (kick/mute).
// LiveKitRoom ichida ishlaydi — real-time useParticipants dan olinadi.

import { useState } from "react";
import { useParticipants, useLocalParticipant } from "@livekit/components-react";
import { X, Users, MicOff, UserX, ShieldCheck } from "lucide-react";

interface Props { open: boolean; onClose: () => void; callId: string; isHost: boolean }

export function NxGroupParticipants({ open, onClose, callId, isHost }: Props) {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const [busy, setBusy] = useState<string>("");

    if (!open) return null;

    const mute = async (identity: string, source: "audio" | "video") => {
        setBusy(identity);
        try {
            await fetch(`/api/nexus/group-calls/${callId}/mute`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identity, source }),
            });
        } finally { setBusy(""); }
    };

    const kick = async (identity: string) => {
        if (!confirm("Ushbu ishtirokchini xonadan chiqarasizmi?")) return;
        setBusy(identity);
        try {
            await fetch(`/api/nexus/group-calls/${callId}/kick`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identity }),
            });
        } finally { setBusy(""); }
    };

    return (
        <>
            <div className="fixed inset-0 z-[310] bg-black/60 backdrop-blur-sm md:hidden"
                onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[311] flex max-h-[70vh] flex-col overflow-hidden rounded-t-3xl bg-[#080C20] shadow-2xl md:inset-y-0 md:inset-x-auto md:left-0 md:max-h-full md:w-[340px] md:rounded-none md:rounded-r-3xl"
                style={{ border: "1px solid rgba(43,62,232,0.22)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex flex-shrink-0 items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="flex items-center gap-2 text-base font-black text-white">
                        <Users className="h-4 w-4" style={{ color: "#00CEC8" }} /> Ishtirokchilar ({participants.length})
                    </h3>
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-5" style={{ scrollbarWidth: "none" }}>
                    {participants.map(p => {
                        const isMe = p.identity === localParticipant?.identity;
                        const isBusy = busy === p.identity;
                        const label = p.name || p.identity;
                        return (
                            <div key={p.identity}
                                className="mb-1 flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.03]">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xs font-black text-white">
                                    {label.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="truncate text-sm font-bold text-white">{label}</p>
                                        {isMe && <span className="rounded-md px-1.5 py-0.5 text-[9px] font-black text-white" style={{ background: "rgba(0,206,200,0.25)", color: "#00CEC8" }}>Siz</span>}
                                    </div>
                                    <p className="mt-0.5 text-[10px]" style={{ color: p.isSpeaking ? "#00CEC8" : "rgba(80,100,150,0.85)" }}>
                                        {p.isSpeaking ? "Gapiryapti" : (p.isMicrophoneEnabled ? "Mikrofon yoniq" : "Mikrofon o'chiq")}
                                    </p>
                                </div>
                                {isHost && !isMe && (
                                    <div className="flex shrink-0 gap-1">
                                        {p.isMicrophoneEnabled && (
                                            <button onClick={() => mute(p.identity, "audio")} disabled={isBusy}
                                                title="Mikrofonini o'chirish"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50"
                                                style={{ background: "rgba(43,62,232,0.15)" }}>
                                                <MicOff className="h-3.5 w-3.5 text-white" />
                                            </button>
                                        )}
                                        <button onClick={() => kick(p.identity)} disabled={isBusy}
                                            title="Xonadan chiqarish"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50"
                                            style={{ background: "rgba(239,68,68,0.20)" }}>
                                            <UserX className="h-3.5 w-3.5" style={{ color: "#EF4444" }} />
                                        </button>
                                    </div>
                                )}
                                {isMe && isHost && (
                                    <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "#00CEC8" }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
