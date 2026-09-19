"use client";

// BN styled sana kiritish — native `<input type="date">` o'rniga.
// BN dark tema + tilla ochish tugmasi. Ichida native input `[color-scheme:dark]`
// bilan chiroyli chiqadi (Chrome/Firefox/Safari o'z kalendarini beradi).

import { useRef, useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { BN } from "@/lib/bn-theme";

// Deterministik oy nomlari — SSR (Node ICU) va klient (brauzer ICU) bir xil
// chiqsin (aks holda toLocaleDateString hydration mismatch beradi → oq ekran).
const MON: Record<string, string[]> = {
    uz: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
    ru: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
function fmt(iso: string, locale: string): string {
    if (!iso) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    const lang = locale.startsWith("ru") ? "ru" : locale.startsWith("en") ? "en" : "uz";
    const mon = MON[lang][Number(m[2]) - 1] ?? "";
    return `${m[3]} ${mon} ${m[1]}`;
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
