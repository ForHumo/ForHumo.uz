"use client";

import { Link } from "@/i18n/routing";
import React from "react";

// Matnni @username (va #hashtag) bo'yicha bosiladigan havolalarga ajratadi.
const TOKEN = /(@[a-z0-9_]{3,20}|#[\p{L}\p{N}_]+)/giu;

export function NxText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
    const parts = text.split(TOKEN);
    return (
        <p className={className} style={style}>
            {parts.map((part, i) => {
                if (/^@[a-z0-9_]{3,20}$/i.test(part)) {
                    const u = part.slice(1).toLowerCase();
                    return <Link key={i} href={`/nexus/u/${u}`} className="font-bold hover:underline" style={{ color: "#00CEC8" }}>{part}</Link>;
                }
                if (/^#[\p{L}\p{N}_]+$/u.test(part)) {
                    return <Link key={i} href={`/nexus/tag/${part.slice(1)}`} className="font-bold hover:underline" style={{ color: "#2B3EE8" }}>{part}</Link>;
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </p>
    );
}
