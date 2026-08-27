"use client";

// @username matn ichida ko'k rangda ko'rsatish. Bosilsa profilga o'tadi.
// Guruh xabarlarida ishlatiladi (NxMarkdown ustidan qo'llaniladi).

import React from "react";
import Link from "next/link";

const MENTION_RE = /@([a-z0-9_]{3,32})/gi;

export function renderMentionsInText(text: string, key = "m"): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    MENTION_RE.lastIndex = 0;
    while ((match = MENTION_RE.exec(text)) !== null) {
        if (match.index > lastIdx) {
            nodes.push(text.slice(lastIdx, match.index));
        }
        const username = match[1];
        nodes.push(
            <Link key={`${key}-${match.index}`}
                href={`/nexus/u/${username}`}
                onClick={e => e.stopPropagation()}
                className="font-bold hover:underline"
                style={{ color: "#00CEC8" }}>
                @{username}
            </Link>
        );
        lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
    return nodes;
}

// Text ichida faqat mention'larni ajratish (kompozitorda highlight uchun)
export function NxMentionText({ text }: { text: string }) {
    return <>{renderMentionsInText(text)}</>;
}
