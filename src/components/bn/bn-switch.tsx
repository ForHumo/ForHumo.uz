"use client";

// BN switch — native checkbox o'rniga chiroyli slide-switch.
// BN dark + tilla accent. Ovoz tekshiruvi (aria) va keyboard'da ishlaydi.

import { BN } from "@/lib/bn-theme";

export function BnSwitch({
    checked, onChange, ariaLabel, disabled, size = "md",
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    ariaLabel?: string;
    disabled?: boolean;
    size?: "sm" | "md" | "lg";
}) {
    const dims = size === "sm"
        ? { w: 32, h: 18, knob: 14 }
        : size === "lg"
        ? { w: 52, h: 30, knob: 24 }
        : { w: 42, h: 24, knob: 18 };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className="relative shrink-0 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
                width: dims.w,
                height: dims.h,
                background: checked ? BN.gold : BN.surfaceUp,
                border: `1px solid ${checked ? BN.gold : BN.border}`,
            }}
        >
            <span
                className="absolute top-1/2 rounded-full transition-all shadow-sm"
                style={{
                    width: dims.knob,
                    height: dims.knob,
                    background: checked ? BN.onGold : BN.text,
                    left: checked ? `calc(100% - ${dims.knob + 3}px)` : "3px",
                    transform: "translateY(-50%)",
                }}
            />
        </button>
    );
}

/**
 * Row wrapper — icon + label + switch. Bosilsa toggle bo'ladi (label click accessible).
 */
export function BnSwitchRow({
    checked, onChange, icon, label, hint, disabled,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    icon?: React.ReactNode;
    label: string;
    hint?: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors disabled:opacity-50"
            style={{
                background: checked ? BN.goldSoft : BN.surfaceUp,
                border: `1px solid ${checked ? BN.borderGold : BN.border}`,
            }}
        >
            {icon && <span style={{ color: checked ? BN.gold : BN.text3 }}>{icon}</span>}
            <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold" style={{ color: checked ? BN.gold : BN.text }}>
                    {label}
                </span>
                {hint && (
                    <span className="block text-[11px] mt-0.5" style={{ color: BN.text3 }}>
                        {hint}
                    </span>
                )}
            </span>
            <BnSwitch checked={checked} onChange={onChange} ariaLabel={label} disabled={disabled} size="md" />
        </button>
    );
}
