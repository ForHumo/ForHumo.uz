"use client";

// Link preview kartochkasi — xabar matnida URL bo'lsa OG metadata.
// Fetch ontalab: birinchi URL uchun /api/nexus/link-preview.
// Cache: modul-scope Map (bitta URL bir marta olinadi).

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

type Meta = {
    url: string;
    title: string | null;
    description: string | null;
    image: string | null;
    site: string | null;
};

const cache = new Map<string, Meta | null>();
const inflight = new Map<string, Promise<Meta | null>>();

function firstUrl(text: string): string | null {
    const m = text.match(/https?:\/\/[^\s<>"')]+/i);
    return m ? m[0] : null;
}

async function fetchMeta(url: string): Promise<Meta | null> {
    if (cache.has(url)) return cache.get(url) ?? null;
    if (inflight.has(url)) return inflight.get(url)!;
    const p = fetch(`/api/nexus/link-preview?url=${encodeURIComponent(url)}`)
        .then(r => r.ok ? r.json() : null)
        .then((d: Meta | null) => {
            cache.set(url, d ?? null);
            inflight.delete(url);
            return d;
        })
        .catch(() => {
            cache.set(url, null);
            inflight.delete(url);
            return null;
        });
    inflight.set(url, p);
    return p;
}

export function NxLinkPreview({ text, compact = false }: { text: string; compact?: boolean }) {
    const url = firstUrl(text);
    const [meta, setMeta] = useState<Meta | null>(null);

    useEffect(() => {
        if (!url) return;
        let alive = true;
        fetchMeta(url).then(d => { if (alive) setMeta(d); });
        return () => { alive = false; };
    }, [url]);

    if (!url || !meta) return null;
    if (!meta.title && !meta.description && !meta.image) return null;

    const host = (() => { try { return new URL(meta.url).hostname.replace(/^www\./, ""); } catch { return meta.url; } })();

    if (compact) {
        return (
            <a href={meta.url} target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.03]"
                style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.18)" }}
                onClick={e => e.stopPropagation()}>
                {meta.image && (
                    <img src={meta.image} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0"
                        style={{ background: "rgba(43,62,232,0.10)" }} />
                )}
                <div className="flex-1 min-w-0">
                    {meta.title && <p className="text-xs font-bold text-white truncate">{meta.title}</p>}
                    <p className="text-[10px] truncate" style={{ color: "rgba(140,160,210,0.7)" }}>{host}</p>
                </div>
                <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(160,176,224,0.6)" }} />
            </a>
        );
    }

    return (
        <a href={meta.url} target="_blank" rel="noopener noreferrer"
            className="mt-2 block rounded-xl overflow-hidden hover:opacity-95 transition"
            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.18)" }}
            onClick={e => e.stopPropagation()}>
            {meta.image && (
                <div className="relative w-full aspect-[1.91/1] overflow-hidden"
                    style={{ background: "rgba(43,62,232,0.10)" }}>
                    <img src={meta.image} alt="" className="w-full h-full object-cover" />
                </div>
            )}
            <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-widest font-black mb-0.5"
                    style={{ color: "#00CEC8" }}>
                    {meta.site ?? host}
                </p>
                {meta.title && <p className="text-sm font-bold text-white line-clamp-2 mb-0.5">{meta.title}</p>}
                {meta.description && (
                    <p className="text-xs line-clamp-2" style={{ color: "rgba(180,195,235,0.75)" }}>
                        {meta.description}
                    </p>
                )}
            </div>
        </a>
    );
}
