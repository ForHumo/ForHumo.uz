"use client";

// BN telefon input — majburiy +998, format +998 (XX) XXX-XX-XX (9-xona).
// Boshqa raqamlar kiritilmaydi, 9 xonadan ortiq yozib bo'lmaydi.
//
// Foydalanish:
//   <BnPhoneInput value={phone} onChange={setPhone} />
// value — doim canonical qator: "+998" + 9 raqam (12 belgi). Bo'sh: "+998".
// Formatlangan ko'rinishi UI'da ko'rinadi (input ichida).

import { forwardRef, useMemo } from "react";
import { BN } from "@/lib/bn-theme";
import { Phone } from "lucide-react";

/** faqat +998 va 9 xonadan iborat canonical qator qaytaradi */
export function normalizeUzPhone(raw: string): string {
    // faqat raqamlarni ushlab qolamiz
    const digits = raw.replace(/\D/g, "");
    // +998 va bosh nol yoki 998 prefixni tozalash
    let rest = digits;
    if (rest.startsWith("998")) rest = rest.slice(3);
    // 9 xonadan ortig'ini olib tashlash
    rest = rest.slice(0, 9);
    return "+998" + rest;
}

/** canonical "+998XXXXXXXXX" → "+998 (XX) XXX-XX-XX" */
export function formatUzPhone(canonical: string): string {
    const rest = canonical.replace(/^\+998/, "").replace(/\D/g, "").slice(0, 9);
    let out = "+998";
    if (rest.length > 0) out += " (" + rest.slice(0, 2);
    if (rest.length >= 2) out += ")";
    if (rest.length > 2) out += " " + rest.slice(2, 5);
    if (rest.length > 5) out += "-" + rest.slice(5, 7);
    if (rest.length > 7) out += "-" + rest.slice(7, 9);
    return out;
}

/** 9 xona to'la kiritilganmi? */
export function isValidUzPhone(canonical: string): boolean {
    return /^\+998\d{9}$/.test(canonical);
}

interface Props {
    value: string;
    onChange: (canonical: string) => void;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    className?: string;
    autoFocus?: boolean;
}

export const BnPhoneInput = forwardRef<HTMLInputElement, Props>(function BnPhoneInput(
    { value, onChange, placeholder, disabled, invalid, className, autoFocus }, ref,
) {
    const display = useMemo(() => formatUzPhone(value || "+998"), [value]);

    return (
        <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: BN.text3 }} />
            <input
                ref={ref}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={display}
                onChange={(e) => onChange(normalizeUzPhone(e.target.value))}
                onKeyDown={(e) => {
                    // Enter/Tab/Nav ruxsat
                    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Tab", "Enter"];
                    if (allowed.includes(e.key)) return;
                    // Ctrl/Cmd kombinatsiyalari
                    if (e.ctrlKey || e.metaKey) return;
                    // Faqat raqam
                    if (!/^\d$/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text");
                    onChange(normalizeUzPhone(text));
                }}
                placeholder={placeholder ?? "+998 (XX) XXX-XX-XX"}
                disabled={disabled}
                autoFocus={autoFocus}
                className={`w-full rounded-xl pl-10 pr-3 py-2.5 text-[14px] font-mono outline-none transition-colors ${className ?? ""}`}
                style={{
                    background: BN.surfaceUp,
                    border: `1px solid ${invalid ? "#ef4444" : BN.border}`,
                    color: "#fff",
                }}
            />
        </div>
    );
});
