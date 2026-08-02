"use client";

// Push subscription prompt banner — birinchi marta Nexus'ga kirgan foydalanuvchiga
// bir marta ko'rinadi. "Ha" bosilsa subscribe, "Yo'q" bosilsa 7 kunga jim.
// Push allaqachon yoqilgan bo'lsa hech qachon ko'rinmaydi.

import { useEffect, useState } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { getPushState, subscribePush, pushSupported } from "@/lib/push-client";

const LS_DISMISS = "nx_push_prompt_dismissed_until";

export function NxPushPrompt() {
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        // Serverdan xatolik olmaslik uchun taxmin: server tomonda API yo'q
        if (!pushSupported()) return;

        const dismissedUntil = Number(localStorage.getItem(LS_DISMISS) || 0);
        if (dismissedUntil > Date.now()) return;

        // Foydalanuvchi 30 soniya ushlab tursin (spam bo'lmasin)
        const timer = setTimeout(async () => {
            const state = await getPushState();
            if (state === "unsubscribed" || state === "default") setShow(true);
        }, 30_000);

        return () => clearTimeout(timer);
    }, []);

    const dismiss = (days: number) => {
        localStorage.setItem(LS_DISMISS, String(Date.now() + days * 86400_000));
        setShow(false);
    };

    const enable = async () => {
        setBusy(true);
        try {
            await subscribePush();
            dismiss(365);   // yoqilgan bo'lsa 1 yilga jim
        } catch { dismiss(1); }
        finally { setBusy(false); }
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl max-w-sm w-[90%]"
            style={{
                background: "linear-gradient(135deg,rgba(43,62,232,0.95),rgba(0,206,200,0.90))",
                boxShadow: "0 8px 32px rgba(43,62,232,0.35)",
                backdropFilter: "blur(12px)",
            }}>
            <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.20)" }}>
                <Bell className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-tight">Bildirishnomalarni yoqing</p>
                <p className="text-[11px] text-white/85 leading-tight mt-0.5">Yangi xabar va chaqiruvlarni o&apos;tkazib yubormang</p>
            </div>
            <button onClick={enable} disabled={busy}
                className="px-3 py-1.5 rounded-lg text-[11px] font-black flex-shrink-0 active:scale-95 transition disabled:opacity-60"
                style={{ background: "rgba(255,255,255,0.95)", color: "#1B2E85" }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yoqish"}
            </button>
            <button onClick={() => dismiss(7)}
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center active:scale-95 transition"
                style={{ background: "rgba(0,0,0,0.20)" }} title="Keyinroq">
                <X className="w-3.5 h-3.5 text-white" />
            </button>
        </div>
    );
}
