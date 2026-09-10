"use client";

// BN styled sana kiritish — native `<input type="date">` o'rniga.
// BN dark tema + tilla ochish tugmasi. Ichida native input `[color-scheme:dark]`
// bilan chiroyli chiqadi (Chrome/Firefox/Safari o'z kalendarini beradi).

import { useRef, useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { BN } from "@/lib/bn-theme";

function fmt(iso: string, locale: string): string {
    if (!iso) return "";
    try {
        const d = new Date(iso + "T00:00:00");
        return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
    } catch { return iso; }
}

export function BnDateInput({
    value, onChange, min, max, disabled, className, ariaLabel, placeholder, locale = "uz-UZ",
}: {
    value: string;                // YYYY-MM-DD
    onChange: (v: string) => void;
    min?: string;
    max?: string;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
    placeholder?: string;
    locale?: string;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [focused, setFocused] = useState(false);

    // Native input picker'ni ochish (Chrome 99+/Firefox 116+/Safari)
    function openPicker() {
        const el = ref.current;
        if (!el || disabled) return;
        if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
            try { (el as HTMLInputElement & { showPicker?: () => void }).showPicker!(); return; } catch { /* fallback */ }
        }
        el.focus();
    }

    useEffect(() => { /* noop — placeholder for future keyboard shortcuts */ }, []);

    return (
        <div className={`relative ${className ?? ""}`}>
            <button
                type="button"
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={openPicker}
                className="w-full h-11 flex items-center justify-between gap-2 px-3.5 rounded-xl text-[14px] text-left transition-colors disabled:opacity-60"
                style={{
                    background: BN.surfaceUp,
                    border: `1px solid ${focused ? BN.gold : BN.border}`,
                    color: value ? BN.text : BN.text3,
                }}
            >
                <span className="truncate">
                    {value ? fmt(value, locale) : (placeholder ?? "Sanani tanlang")}
                </span>
                <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: BN.gold }} />
            </button>
            {/* Ko'rinmas native input — picker uni ochadi, tema dark */}
            <input
                ref={ref}
                type="date"
                value={value}
                min={min}
                max={max}
                disabled={disabled}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="absolute inset-0 opacity-0 pointer-events-none [color-scheme:dark]"
                aria-hidden="true"
                tabIndex={-1}
            />
        </div>
    );
}
