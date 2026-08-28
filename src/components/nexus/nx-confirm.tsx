"use client";

// NxConfirm — brauzerning native confirm() o'rniga Nexus dizaynidagi tasdiqlash modali.
// Barcha CRUD delete / bekor qilish oqimlarida foydalaning.
//
// Usage:
//   const [open, setOpen] = useState(false);
//   <NxConfirm open={open} title="..." message="..." confirmText="O'chirish"
//              onConfirm={async () => { ...; setOpen(false); }} onCancel={() => setOpen(false)} />

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export function NxConfirm({
    open, title, message, confirmText = "Tasdiqlash", cancelText = "Bekor qilish",
    tone = "danger", onConfirm, onCancel, busy = false,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    tone?: "danger" | "info";
    onConfirm: () => void;
    onCancel: () => void;
    busy?: boolean;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onCancel();
            if (e.key === "Enter" && !busy) onConfirm();
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [open, busy, onCancel, onConfirm]);

    if (!mounted || !open) return null;

    const accent = tone === "danger" ? "#EF4444" : "#00CEC8";
    const accent2 = tone === "danger" ? "#F97316" : "#2B3EE8";

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998] animate-in fade-in duration-150"
                style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(10px)" }}
                onClick={busy ? undefined : onCancel} />
            <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-sm p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: `1px solid ${tone === "danger" ? "rgba(239,68,68,0.35)" : "rgba(0,206,200,0.30)"}`,
                    boxShadow: `0 24px 80px rgba(0,0,0,0.70), 0 0 40px ${tone === "danger" ? "rgba(239,68,68,0.15)" : "rgba(0,206,200,0.15)"}`,
                }}>
                <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})`, boxShadow: `0 8px 24px ${tone === "danger" ? "rgba(239,68,68,0.35)" : "rgba(0,206,200,0.30)"}` }}>
                    <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-base font-black text-white text-center mb-2">{title}</h3>
                <p className="text-xs leading-relaxed text-center mb-6" style={{ color: "rgba(180,190,220,0.85)" }}>{message}</p>
                <div className="flex gap-2">
                    <button onClick={onCancel} disabled={busy}
                        className="flex-1 h-11 rounded-xl text-sm font-black text-white transition active:scale-95 disabled:opacity-50"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.30)" }}>
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} disabled={busy}
                        className="flex-1 h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                        style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})`, boxShadow: `0 4px 16px ${tone === "danger" ? "rgba(239,68,68,0.30)" : "rgba(0,206,200,0.25)"}` }}>
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </>,
        document.body,
    );
}
