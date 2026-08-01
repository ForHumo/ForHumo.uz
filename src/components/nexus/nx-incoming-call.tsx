"use client";

// Global kelayotgan chaqiruv poller + qabul/rad overlay.
// Nexus shell'da bir marta mount qilinadi; sessiya bo'yicha 2.5s'da /incoming ni tekshiradi.

import { useEffect } from "react";
import Image from "next/image";
import { Phone, Video, PhoneOff, BadgeCheck } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";
import NxCallWindow from "./nx-call-window";

const POLL_MS = 2500;

export function NxIncomingCall() {
    const { incoming, setIncoming, acceptIncoming, rejectIncoming, activeCall, closeActiveCall } = useNxPlayer();

    useEffect(() => {
        let stopped = false;
        const tick = async () => {
            if (stopped) return;
            // Faol chaqiruv bor bo'lsa yangi kelayotganni tekshirmaymiz
            if (activeCall) return;
            const r = await fetch("/api/nexus/calls/incoming").then(x => x.json()).catch(() => null) as { call?: { id: string; kind: "AUDIO" | "VIDEO"; caller: { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null; verified: boolean } } | null } | null;
            if (r?.call) {
                setIncoming({ id: r.call.id, kind: r.call.kind, caller: r.call.caller });
            } else if (incoming) {
                // Serverda RINGING qolmadi — modalni yop
                setIncoming(null);
            }
        };
        tick();
        const iv = setInterval(tick, POLL_MS);
        return () => { stopped = true; clearInterval(iv); };
    }, [incoming, setIncoming, activeCall]);

    return (
        <>
            {incoming && !activeCall && (
                <div className="fixed inset-0 z-[290] flex items-end justify-center bg-black/70 sm:items-center">
                    <div className="w-full max-w-sm rounded-t-3xl bg-gradient-to-br from-indigo-950 via-violet-900 to-black p-6 shadow-2xl sm:rounded-3xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/15">
                                {incoming.caller.image
                                    ? <Image src={incoming.caller.image} alt="" width={56} height={56} className="h-full w-full object-cover" />
                                    : <div className="flex h-full w-full items-center justify-center text-lg font-black text-white">{(incoming.caller.name || incoming.caller.username || "??").slice(0, 2).toUpperCase()}</div>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <p className="truncate text-base font-black text-white">{incoming.caller.name || incoming.caller.username || incoming.caller.humoId || "Chaqiruv"}</p>
                                    {incoming.caller.verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                                </div>
                                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-white/70">
                                    {incoming.kind === "VIDEO" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                                    {incoming.kind === "VIDEO" ? "Video chaqiruv" : "Ovozli chaqiruv"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-around gap-4">
                            <button onClick={() => rejectIncoming(incoming.id)}
                                className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 shadow-lg transition-transform hover:scale-105 active:scale-95">
                                <PhoneOff className="h-6 w-6 text-white" />
                            </button>
                            <button onClick={() => acceptIncoming(incoming.id)}
                                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg transition-transform hover:scale-105 active:scale-95">
                                {incoming.kind === "VIDEO" ? <Video className="h-6 w-6 text-white" /> : <Phone className="h-6 w-6 text-white" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {activeCall && (
                <NxCallWindow
                    callId={activeCall.callId}
                    role={activeCall.role}
                    kind={activeCall.kind}
                    peer={activeCall.peer}
                    autoAccepted={activeCall.autoAccepted}
                    onClose={closeActiveCall}
                />
            )}
        </>
    );
}
