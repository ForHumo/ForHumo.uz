"use client";
import type { CSSProperties, ReactNode } from "react";

type Tone = "accent" | "ok" | "warn" | "neutral";

const T: Record<Tone, CSSProperties> = {
    accent: { background: "var(--nx-accent-weak)", color: "var(--nx-accent)" },
    ok: { background: "rgba(34,197,94,.14)", color: "var(--nx-ok)" },
    warn: { background: "rgba(245,158,11,.14)", color: "var(--nx-warn)" },
    neutral: { background: "var(--nx-surface-2)", color: "var(--nx-text-2)" },
};

export function NxBadge({ tone = "accent", children }: { tone?: Tone; children: ReactNode }) {
    return <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 999, ...T[tone] }}>{children}</span>;
}
