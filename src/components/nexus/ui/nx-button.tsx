"use client";
import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "ghost" | "quiet" | "danger";

const base: CSSProperties = {
    fontWeight: 600, fontSize: 14, borderRadius: "var(--nx-r-md)", padding: "11px 18px",
    border: "1px solid transparent", cursor: "pointer", display: "inline-flex",
    alignItems: "center", gap: 8, transition: "filter .15s, background .15s",
};

const V: Record<Variant, CSSProperties> = {
    primary: { background: "var(--nx-accent)", color: "var(--nx-accent-ink)" },
    ghost: { background: "var(--nx-surface-2)", color: "var(--nx-text)", borderColor: "var(--nx-border)" },
    quiet: { background: "transparent", color: "var(--nx-text-2)" },
    danger: { background: "var(--nx-danger)", color: "#fff" },
};

export function NxButton(
    { variant = "primary", style, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant },
) {
    return <button {...rest} style={{ ...base, ...V[variant], ...style }} />;
}
