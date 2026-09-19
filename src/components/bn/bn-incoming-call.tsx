"use client";

// BN kelayotgan qo'ng'iroq oynasi — qabul/rad. Mahsulot konteksti ko'rsatiladi
// ("qaysi e'lon bo'yicha"). Jiringlash (WebAudio) + vibratsiya.

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Phone, PhoneOff, Video, User, ShieldCheck } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import type { CallPeer, BnCallProductCtx } from "./bn-call-window";

interface Props {
    incoming: { kind: "AUDIO" | "VIDEO"; caller: CallPeer; bnProduct: BnCallProductCtx | null };
    onAccept: () => void;
    onReject: () => void;
}

export function BnIncomingCall({ incoming, onAccept, onReject }: Props) {
    const { caller, kind, bnProduct } = incoming;

    // Jiringlash — takrorlanuvchi ikki-ton + vibratsiya
    useEffect(() => {
        let ctx: AudioContext | null = null;
        let stopped = false;
        try {
            const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (AC) {
                ctx = new AC();
                const ring = () => {
                    if (stopped || !ctx) return;
                    const now = ctx.currentTime;
                    [0, 0.4].forEach((t, i) => {
                        const osc = ctx!.createOscillator();
                        const g = ctx!.createGain();
                        osc.frequency.value = i === 0 ? 480 : 620;
                        osc.connect(g); g.connect(ctx!.destination);
                        g.gain.setValueAtTime(0.0001, now + t);
                        g.gain.exponentialRampToValueAtTime(0.12, now + t + 0.03);
                        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.32);
                        osc.start(now + t); osc.stop(now + t + 0.34);
                    });
                };
                ring();
                const iv = setInterval(ring, 2000);
                const cleanup = () => clearInterval(iv);
                // vibratsiya
                try { navigator.vibrate?.([400, 300, 400, 300, 400]); } catch { /* noop */ }
                const vib = setInterval(() => { try { navigator.vibrate?.([400, 300, 400]); } catch { /* noop */ } }, 2200);
                return () => { stopped = true; cleanup(); clearInterval(vib); try { navigator.vibrate?.(0); } catch { /* noop */ } try { ctx?.close(); } catch { /* noop */ } };
            }
        } catch { /* audio yo'q */ }
        return () => { stopped = true; try { ctx?.close(); } catch { /* noop */ } };
    }, []);

    const ringRef = useRef<HTMLDivElement>(null);

    if (typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-[410] flex flex-col items-center justify-between py-16" style={{ background: "#0b0a07", paddingTop: "max(64px, env(safe-area-inset-top))", paddingBottom: "max(56px, env(safe-area-inset-bottom))" }}>
            <div className="flex flex-col items-center gap-4">
                <div className="text-[13px] font-bold uppercase tracking-wider" style={{ color: BN.gold }}>
                    {kind === "VIDEO" ? "Video qo'ng'iroq" : "Qo'ng'iroq"}
                </div>
                <div ref={ringRef} className="relative">
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ background: BN.goldSoft }} />
                    <div className="relative w-28 h-28 rounded-full overflow-hidden grid place-items-center" style={{ background: BN.surfaceUp, border: `2px solid ${BN.gold}` }}>
                        {caller.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={caller.image} alt="" className="w-full h-full object-cover" />
                        ) : <User className="w-12 h-12" style={{ color: BN.text3 }} />}
                    </div>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                        <span className="text-[22px] font-black text-white">{caller.name || (caller.username ? `@${caller.username}` : "Xaridor")}</span>
                        {caller.verified && <ShieldCheck className="w-4 h-4" style={{ color: BN.gold }} />}
                    </div>
                    <div className="text-[14px] mt-1" style={{ color: BN.text3 }}>sizga qo&apos;ng&apos;iroq qilyapti</div>
                </div>

                {bnProduct && (
                    <div className="flex items-center gap-2.5 rounded-2xl pl-2 pr-4 py-2 mt-2" style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                        {bnProduct.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={bnProduct.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        )}
                        <div className="min-w-0">
                            <div className="text-[11px]" style={{ color: BN.text3 }}>Mahsulot bo&apos;yicha</div>
                            <div className="text-[14px] font-bold text-white truncate max-w-[200px]">{bnProduct.title}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Qabul / Rad */}
            <div className="flex items-center gap-16">
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={onReject}
                        aria-label="Rad etish"
                        className="w-16 h-16 grid place-items-center rounded-full transition-transform active:scale-95"
                        style={{ background: BN.err, color: "#fff" }}
                    >
                        <PhoneOff className="w-7 h-7" />
                    </button>
                    <span className="text-[12px]" style={{ color: BN.text3 }}>Rad</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={onAccept}
                        aria-label="Qabul qilish"
                        className="w-16 h-16 grid place-items-center rounded-full transition-transform active:scale-95"
                        style={{ background: BN.ok, color: "#fff" }}
                    >
                        {kind === "VIDEO" ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                    </button>
                    <span className="text-[12px]" style={{ color: BN.text3 }}>Qabul</span>
                </div>
            </div>
        </div>,
        document.body,
    );
}
