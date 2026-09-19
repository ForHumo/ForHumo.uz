"use client";

// BN qo'ng'iroq provayderi — BN layout'ga mount qilinadi. Butun BN bo'ylab
// qo'ng'iroq boshlash (window event "bn:start-call") + kelayotgan qo'ng'iroqni
// qabul qilish (incoming poll + Pusher). Nexus signaling backend'ini ishlatadi.

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher-client";
import { bnToast } from "./bn-toast";
import { BnCallWindow, type CallPeer, type BnCallProductCtx } from "./bn-call-window";
import { BnIncomingCall } from "./bn-incoming-call";

interface ActiveCall {
    callId: string;
    role: "caller" | "callee";
    kind: "AUDIO" | "VIDEO";
    peer: CallPeer;
    bnProduct: BnCallProductCtx | null;
    autoAccepted?: boolean;
}
interface Incoming {
    id: string;
    kind: "AUDIO" | "VIDEO";
    caller: CallPeer;
    bnProduct: BnCallProductCtx | null;
}

// Boshqa komponentlar shu event bilan qo'ng'iroq boshlaydi (context'ga bog'liq emas).
export interface BnStartCallDetail {
    peerId: string;
    kind?: "AUDIO" | "VIDEO";
    bnProductId?: string | null;
    peer: CallPeer;
    bnProduct?: BnCallProductCtx | null;
}
export function startBnCall(detail: BnStartCallDetail) {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("bn:start-call", { detail }));
}

export function BnCallProvider() {
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [incoming, setIncoming] = useState<Incoming | null>(null);
    const activeRef = useRef(false);
    activeRef.current = !!activeCall;

    const { data: session } = useSession();
    // @ts-expect-error profileId sessiyaga runtime'da qo'shiladi
    const myProfileId: string | null = session?.user?.profileId ?? null;

    // ── Qo'ng'iroq boshlash ──────────────────────────────────────────────────
    const start = useCallback(async (d: BnStartCallDetail) => {
        if (activeRef.current) { bnToast("Sizda faol qo'ng'iroq bor", "error"); return; }
        const kind = d.kind === "VIDEO" ? "VIDEO" : "AUDIO";
        try {
            const r = await fetch("/api/nexus/calls", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ peerId: d.peerId, kind, bnProductId: d.bnProductId ?? null }),
            });
            const j = await r.json();
            if (!r.ok) { bnToast(j?.error || "Qo'ng'iroq boshlanmadi", "error"); return; }
            setActiveCall({ callId: j.call.id, role: "caller", kind, peer: d.peer, bnProduct: d.bnProduct ?? null });
        } catch {
            bnToast("Ulanish xatoligi", "error");
        }
    }, []);

    useEffect(() => {
        const h = (e: Event) => { const d = (e as CustomEvent<BnStartCallDetail>).detail; if (d) void start(d); };
        window.addEventListener("bn:start-call", h);
        return () => window.removeEventListener("bn:start-call", h);
    }, [start]);

    // ── Kelayotgan qo'ng'iroq — enrichlangan /incoming'dan olamiz ────────────
    const fetchIncoming = useCallback(async () => {
        if (activeRef.current) return;
        try {
            const r = await fetch("/api/nexus/calls/incoming", { cache: "no-store" });
            const j = await r.json();
            if (j?.call) {
                setIncoming(prev => prev?.id === j.call.id ? prev : {
                    id: j.call.id, kind: j.call.kind, caller: j.call.caller,
                    bnProduct: j.call.bnProduct ?? null,
                });
            }
        } catch { /* jim */ }
    }, []);

    // Polling fallback (Pusher bo'lmasa/uzilsa)
    useEffect(() => {
        if (activeCall) return;
        let stopped = false;
        const pollMs = getPusherClient() ? 9000 : 4000;
        void fetchIncoming();
        const iv = setInterval(() => { if (!stopped) void fetchIncoming(); }, pollMs);
        return () => { stopped = true; clearInterval(iv); };
    }, [activeCall, fetchIncoming]);

    // Pusher real-time — call:incoming kelsa darhol enrichlab olamiz
    useEffect(() => {
        if (!myProfileId) return;
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`private-user-${myProfileId}`);
        const onIncoming = () => { if (!activeRef.current) void fetchIncoming(); };
        channel.bind("call:incoming", onIncoming);
        return () => { channel.unbind("call:incoming", onIncoming); };
    }, [myProfileId, fetchIncoming]);

    const accept = useCallback(async () => {
        if (!incoming) return;
        const inc = incoming;
        setIncoming(null);
        try {
            const r = await fetch(`/api/nexus/calls/${inc.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "accept" }),
            });
            if (!r.ok) { bnToast("Qabul qilinmadi", "error"); return; }
            setActiveCall({ callId: inc.id, role: "callee", kind: inc.kind, peer: inc.caller, bnProduct: inc.bnProduct, autoAccepted: true });
        } catch { bnToast("Ulanish xatoligi", "error"); }
    }, [incoming]);

    const reject = useCallback(async () => {
        if (!incoming) return;
        const inc = incoming;
        setIncoming(null);
        fetch(`/api/nexus/calls/${inc.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reject" }),
        }).catch(() => { });
    }, [incoming]);

    return (
        <>
            {activeCall && (
                <BnCallWindow
                    callId={activeCall.callId}
                    role={activeCall.role}
                    kind={activeCall.kind}
                    peer={activeCall.peer}
                    bnProduct={activeCall.bnProduct}
                    autoAccepted={activeCall.autoAccepted}
                    onClose={() => setActiveCall(null)}
                />
            )}
            {incoming && !activeCall && (
                <BnIncomingCall incoming={incoming} onAccept={accept} onReject={reject} />
            )}
        </>
    );
}
