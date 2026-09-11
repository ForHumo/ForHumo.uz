"use client";

// BN uslubidagi confirm() va prompt() — native brauzer dialoglar o'rniga.
// Promise-based API:
//   const ok = await bnConfirm({ title, message, confirmLabel, danger });
//   const val = await bnPrompt({ title, message, defaultValue, placeholder });
//
// Root layout'ga BnDialogHost bir marta mount qilinadi.

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface ConfirmOpts {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

interface PromptOpts {
    title: string;
    message?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    inputType?: "text" | "number";
    maxLength?: number;
    multiline?: boolean;
}

type DialogRequest =
    | { kind: "confirm"; opts: ConfirmOpts; resolve: (ok: boolean) => void }
    | { kind: "prompt"; opts: PromptOpts; resolve: (val: string | null) => void };

const listeners: Array<(r: DialogRequest) => void> = [];

export function bnConfirm(opts: ConfirmOpts): Promise<boolean> {
    return new Promise((resolve) => {
        const req: DialogRequest = { kind: "confirm", opts, resolve };
        if (listeners.length === 0) {
            // BnDialogHost mount qilinmagan — fail-safe: standart confirm ishlatamiz.
            const ok = typeof window !== "undefined"
                ? window.confirm(`${opts.title}${opts.message ? "\n\n" + opts.message : ""}`)
                : false;
            resolve(ok);
            return;
        }
        for (const l of listeners) l(req);
    });
}

export function bnPrompt(opts: PromptOpts): Promise<string | null> {
    return new Promise((resolve) => {
        const req: DialogRequest = { kind: "prompt", opts, resolve };
        if (listeners.length === 0) {
            const val = typeof window !== "undefined"
                ? window.prompt(`${opts.title}${opts.message ? "\n\n" + opts.message : ""}`, opts.defaultValue ?? "")
                : null;
            resolve(val);
            return;
        }
        for (const l of listeners) l(req);
    });
}

export function BnDialogHost() {
    const [req, setReq] = useState<DialogRequest | null>(null);
    const [mounted, setMounted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        setMounted(true);
        const handler = (r: DialogRequest) => {
            setInputValue(r.kind === "prompt" ? (r.opts.defaultValue ?? "") : "");
            setReq(r);
            setTimeout(() => inputRef.current?.focus(), 30);
        };
        listeners.push(handler);
        return () => {
            const i = listeners.indexOf(handler);
            if (i >= 0) listeners.splice(i, 1);
        };
    }, []);

    useEffect(() => {
        if (!req) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close(null);
            if (e.key === "Enter" && req.kind === "confirm") accept();
            if (e.key === "Enter" && req.kind === "prompt" && !req.opts.multiline) accept();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [req, inputValue]);

    if (!mounted || !req || typeof document === "undefined") return null;

    function close(result: boolean | string | null) {
        if (!req) return;
        if (req.kind === "confirm") req.resolve(typeof result === "boolean" ? result : false);
        else req.resolve(typeof result === "string" ? result : null);
        setReq(null);
    }

    function accept() {
        if (!req) return;
        if (req.kind === "confirm") close(true);
        else close(inputValue.trim());
    }

    const isConfirm = req.kind === "confirm";
    const danger = isConfirm && (req.opts as ConfirmOpts).danger;
    const confirmLabel = req.opts.confirmLabel ?? (isConfirm ? "Tasdiqlash" : "Saqlash");
    const cancelLabel = req.opts.cancelLabel ?? "Bekor qilish";

    return createPortal(
        <div
            className="bn-scope fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
            style={{
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(6px)",
                paddingBottom: "max(16px, env(safe-area-inset-bottom))",
            }}
            onClick={() => close(null)}
        >
            <div
                className="w-full max-w-[420px] rounded-3xl overflow-hidden relative animate-[bnFadeUp_.18s_ease-out]"
                style={{ background: BN.surface, border: `1px solid ${BN.border}`, boxShadow: BN.shadow }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <button
                    onClick={() => close(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center transition-colors hover:bg-white/10"
                    style={{ color: BN.text3 }}
                    aria-label="Yopish"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="px-6 pt-6 pb-4">
                    {danger && (
                        <div
                            className="w-12 h-12 rounded-2xl grid place-items-center mb-3"
                            style={{ background: BN.errSoft, color: BN.err }}
                        >
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    )}
                    <h3 className="text-[18px] font-black tracking-tight mb-1.5" style={{ color: BN.text }}>
                        {req.opts.title}
                    </h3>
                    {req.opts.message && (
                        <p className="text-[13.5px] leading-relaxed" style={{ color: BN.text2 }}>
                            {req.opts.message}
                        </p>
                    )}

                    {req.kind === "prompt" && (
                        req.opts.multiline ? (
                            <textarea
                                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={req.opts.placeholder}
                                maxLength={req.opts.maxLength}
                                rows={3}
                                className="bn-input mt-3"
                                style={{ height: "auto", padding: "10px 12px", resize: "vertical", minHeight: 72 }}
                            />
                        ) : (
                            <input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                type={req.opts.inputType === "number" ? "number" : "text"}
                                inputMode={req.opts.inputType === "number" ? "decimal" : undefined}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={req.opts.placeholder}
                                maxLength={req.opts.maxLength}
                                className="bn-input mt-3"
                            />
                        )
                    )}
                </div>

                <div className="px-4 pb-4 flex items-center gap-2">
                    <button
                        onClick={() => close(null)}
                        className="flex-1 h-11 rounded-2xl text-[14px] font-semibold transition-colors hover:bg-white/5"
                        style={{ color: BN.text2, border: `1px solid ${BN.border}` }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={accept}
                        className="flex-1 h-11 rounded-2xl text-[14px] font-bold transition-transform active:scale-[0.98]"
                        style={danger
                            ? { background: BN.err, color: "#fff" }
                            : { background: BN.gold, color: BN.onGold }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes bnFadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>,
        document.body,
    );
}
