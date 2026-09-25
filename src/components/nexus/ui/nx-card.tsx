"use client";
import type { HTMLAttributes } from "react";

export function NxCard({ style, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return <div {...rest} style={{
        background: "var(--nx-surface)", border: "1px solid var(--nx-border)",
        borderRadius: "var(--nx-r-lg)", boxShadow: "var(--nx-shadow)", ...style,
    }} />;
}
