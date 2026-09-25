"use client";
import { useState, type InputHTMLAttributes } from "react";

export function NxInput({ style, onFocus, onBlur, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
    const [f, setF] = useState(false);
    return <input {...rest}
        onFocus={(e) => { setF(true); onFocus?.(e); }}
        onBlur={(e) => { setF(false); onBlur?.(e); }}
        style={{
            fontSize: 14, background: "var(--nx-surface-2)", color: "var(--nx-text)",
            border: `1px solid ${f ? "var(--nx-accent)" : "var(--nx-border)"}`,
            boxShadow: f ? "0 0 0 3px var(--nx-accent-weak)" : "none",
            borderRadius: "var(--nx-r-md)", padding: "11px 14px", outline: "none", ...style,
        }} />;
}
