"use client";

// BN styled select — native <select> o'rniga.
// BN dark-first tema + tilla accent, kalitni ochilganda modal panel chiqadi.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { BN } from "@/lib/bn-theme";

export interface BnSelectOption {
    value: string;
    label: string;
    hint?: string;
}

export function BnSelect({
    value, onChange, options, placeholder, disabled, className,
    ariaLabel,
}: {
    value: string;
    onChange: (v: string) => void;
    options: BnSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={rootRef} className={`relative ${className ?? ""}`}>
            <button
                type="button"
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => setOpen(v => !v)}
                className="w-full h-11 flex items-center justify-between gap-2 px-3.5 rounded-xl text-[14px] text-left transition-colors disabled:opacity-60"
                style={{
                    background: BN.surfaceUp,
                    border: `1px solid ${open ? BN.gold : BN.border}`,
                    color: selected ? BN.text : BN.text3,
                }}
            >
                <span className="truncate">{selected ? selected.label : (placeholder ?? "Tanlang")}</span>
                <ChevronDown
                    className="w-4 h-4 flex-shrink-0 transition-transform"
                    style={{ color: BN.text3, transform: open ? "rotate(180deg)" : undefined }}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="bn-pop absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-xl py-1"
                    style={{
                        background: BN.surfaceTop,
                        border: `1px solid ${BN.border}`,
                        boxShadow: BN.shadow,
                    }}
                >
                    {options.map(opt => {
                        const active = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className="w-full flex items-start gap-2 px-3.5 py-2.5 text-left text-[14px] transition-colors hover:opacity-90"
                                style={{
                                    background: active ? BN.goldSoft : "transparent",
                                    color: active ? BN.text : BN.text2,
                                }}
                            >
                                <span className="flex-shrink-0 w-4 pt-0.5">
                                    {active && <Check className="w-4 h-4" style={{ color: BN.gold }} />}
                                </span>
                                <span className="flex-1">
                                    <span className="block font-medium">{opt.label}</span>
                                    {opt.hint && (
                                        <span className="block text-[12px] mt-0.5" style={{ color: BN.text3 }}>
                                            {opt.hint}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                    {options.length === 0 && (
                        <div className="px-3.5 py-3 text-[13px]" style={{ color: BN.text3 }}>
                            Variantlar yo&apos;q
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
