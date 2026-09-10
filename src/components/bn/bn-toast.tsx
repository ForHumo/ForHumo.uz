"use client";

// BN uslubidagi toast — native alert() o'rniga.
// `bnToast(text, kind?)` chaqiruvi — istalgan joyda ishlaydi.
// Root'da BnToastHost mount qilinadi (bir marta).

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { BN } from "@/lib/bn-theme";

export type BnToastKind = "info" | "success" | "error";
interface Toast { id: number; text: string; kind: BnToastKind; }

const listeners: Array<(t: Toast) => void> = [];
let counter = 0;

/**
 * Istalgan joyda chaqirilishi mumkin — client komponent ichida.
 * BnToastHost mount qilingan bo'lsa toast chiqadi. Aks holda jim (fail-safe).
 */
export function bnToast(text: string, kind: BnToastKind = "info") {
    counter += 1;
    const t: Toast = { id: counter, text, kind };
    for (const l of listeners) l(t);
}

export function BnToastHost() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const push = (t: Toast) => {
            setToasts(prev => [...prev, t]);
            window.setTimeout(() => {
                setToasts(prev => prev.filter(x => x.id !== t.id));
            }, 5000);
        };
        listeners.push(push);
        return () => {
            const i = listeners.indexOf(push);
            if (i >= 0) listeners.splice(i, 1);
        };
    }, []);

    if (!mounted || typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed z-[9998] top-4 right-4 flex flex-col gap-2 max-w-[min(92vw,380px)] pointer-events-none">
            {toasts.map(t => {
                const meta = {
                    success: { bg: BN.ok, icon: <CheckCircle2 className="w-4 h-4" /> },
                    error:   { bg: BN.err, icon: <AlertTriangle className="w-4 h-4" /> },
                    info:    { bg: BN.gold, icon: <Info className="w-4 h-4" /> },
                }[t.kind];
                return (
                    <div key={t.id}
                        className="pointer-events-auto flex items-start gap-2 pl-3 pr-2 py-2.5 rounded-xl shadow-2xl animate-[slideIn_0.2s_ease-out]"
                        style={{
                            background: BN.surface,
                            border: `1px solid ${BN.border}`,
                            boxShadow: `0 20px 60px ${BN.shadow}, 0 0 0 1px ${meta.bg}44`,
                        }}
                    >
                        <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 mt-0.5"
                            style={{ background: `${meta.bg}22`, color: meta.bg }}>
                            {meta.icon}
                        </span>
                        <span className="flex-1 text-[13.5px] font-bold leading-snug pt-1" style={{ color: BN.text }}>
                            {t.text}
                        </span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                            aria-label="Yopish"
                            className="w-6 h-6 grid place-items-center rounded flex-shrink-0"
                            style={{ color: BN.text3 }}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>,
        document.body,
    );
}
