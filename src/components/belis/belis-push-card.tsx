"use client";

// Belis Web Push obuna kartochkasi.
// belis.uz'da booking detail va kabinet'da ko'rinadi.
// Nexus/BN infrastruktura qayta ishlatiladi (NexusPushSub).

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2, X } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { getPushState, subscribePush, unsubscribePush, type PushState } from "@/lib/push-client";

export function BelisPushCard() {
    const [state, setState] = useState<PushState>("unsupported");
    const [busy, setBusy] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        void getPushState().then(setState);
        try { if (localStorage.getItem("belis-push-dismissed-v1")) setDismissed(true); } catch { /* noop */ }
    }, []);

    async function enable() {
        setBusy(true);
        try { setState(await subscribePush()); }
        finally { setBusy(false); }
    }
    async function disable() {
        setBusy(true);
        try { setState(await unsubscribePush()); }
        finally { setBusy(false); }
    }
    function dismiss() {
        try { localStorage.setItem("belis-push-dismissed-v1", "1"); } catch { /* noop */ }
        setDismissed(true);
    }

    // Qo'llab-quvvatlanmasa yoki tashlansa yashiramiz
    if (state === "unsupported" || dismissed) return null;

    if (state === "subscribed") {
        return (
            <div className="rounded-2xl p-4 flex items-start gap-3 mb-4"
                style={{ background: `${BELIS.ok}12`, border: `1px solid ${BELIS.ok}55` }}>
                <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BELIS.ok, color: "#fff" }}>
                    <Check className="w-5 h-5" strokeWidth={3} />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black" style={{ color: BELIS.text }}>Bildirishnomalar yoqilgan</p>
                    <p className="text-[12px]" style={{ color: BELIS.text2 }}>
                        Belis'dan buyurtma yangiliklari to&apos;g&apos;ridan-to&apos;g&apos;ri sizga keladi.
                    </p>
                </div>
                <button onClick={disable} disabled={busy}
                    className="w-9 h-9 rounded-lg grid place-items-center disabled:opacity-60"
                    style={{ background: BELIS.bg, color: BELIS.text2 }}
                    title="O'chirish">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
                </button>
            </div>
        );
    }

    if (state === "denied") {
        return (
            <div className="rounded-2xl p-4 mb-4"
                style={{ background: BELIS.errSoft, border: `1px solid ${BELIS.err}55` }}>
                <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BELIS.err, color: "#fff" }}>
                        <BellOff className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black" style={{ color: BELIS.text }}>Bildirishnoma rad etilgan</p>
                        <p className="text-[12px]" style={{ color: BELIS.text2 }}>
                            Brauzer sozlamasidan ruxsat berish mumkin (Belis saytiga → Notifications → Allow).
                        </p>
                    </div>
                    <button onClick={dismiss} className="w-8 h-8 rounded-lg grid place-items-center" style={{ color: BELIS.text3 }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // prompt
    return (
        <div className="rounded-2xl p-4 mb-4"
            style={{ background: BELIS.surface, border: `1px solid ${BELIS.gold}` }}>
            <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <Bell className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black" style={{ color: BELIS.text }}>Bildirishnomalarni yoqing</p>
                    <p className="text-[12px] mt-0.5" style={{ color: BELIS.text2 }}>
                        Belis arizangiz tasdiqlangan/tayyor bo&apos;lganda, marosim kuni yaqinlashganda darhol xabar oling.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <button onClick={enable} disabled={busy}
                            className="h-10 px-4 rounded-xl text-[12.5px] font-black flex items-center gap-1.5 disabled:opacity-60"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Bell className="w-4 h-4" /> Yoqish</>}
                        </button>
                        <button onClick={dismiss}
                            className="h-10 px-3 rounded-xl text-[12.5px] font-black"
                            style={{ background: BELIS.bg, color: BELIS.text3 }}>
                            Keyinroq
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
