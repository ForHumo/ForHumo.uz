"use client";

// Nexus feed'ga tushadigan native reklama posti — Instagram Sponsored uslub.
// Har 15 postdan keyin (yoki bo'sh feed'da ham) 3 slot aylanma tarzda.

import { useEffect, useRef, useState } from "react";
import { Sparkles, ExternalLink } from "lucide-react";

interface NxAd {
    id: string;
    imageUrl: string;
    title: string;
    body: string | null;
    ctaUrl: string;
    ctaText: string;
    ownerUsername: string | null;
    ownerAvatar: string | null;
}

const seenSet = new Set<string>();

export function NxAdCard({ ad }: { ad: NxAd }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [tracked, setTracked] = useState(false);

    // IntersectionObserver — 50% ko'rilganda impressions++
    useEffect(() => {
        if (tracked || seenSet.has(ad.id)) return;
        const el = cardRef.current;
        if (!el) return;
        const io = new IntersectionObserver(entries => {
            for (const e of entries) {
                if (e.isIntersecting && e.intersectionRatio >= 0.5) {
                    seenSet.add(ad.id);
                    setTracked(true);
                    fetch(`/api/nexus/ads/${ad.id}/impression`, { method: "POST", keepalive: true }).catch(() => null);
                    io.disconnect();
                    return;
                }
            }
        }, { threshold: [0.5] });
        io.observe(el);
        return () => io.disconnect();
    }, [ad.id, tracked]);

    function onCtaClick() {
        fetch(`/api/nexus/ads/${ad.id}/click`, { method: "POST", keepalive: true }).catch(() => null);
    }

    return (
        <div
            ref={cardRef}
            className="rounded-3xl overflow-hidden mb-4 relative"
            style={{
                background: "linear-gradient(180deg, rgba(139,92,246,0.08), transparent 50%), var(--nx-surface, #0F1729)",
                border: "1px solid rgba(139,92,246,0.35)",
            }}
        >
            {/* Header — homiy + AD badge */}
            <div className="flex items-center gap-2 p-3">
                {ad.ownerAvatar ? (
                    <img src={ad.ownerAvatar} alt={ad.ownerUsername ?? ""} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(139,92,246,0.2)" }}>
                        <Sparkles className="w-4 h-4" style={{ color: "#A78BFA" }} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white flex items-center gap-1.5">
                        {ad.ownerUsername ?? "For Humo"}
                        <span className="inline-flex items-center h-5 px-1.5 rounded text-[9px] font-bold" style={{ background: "rgba(139,92,246,0.25)", color: "#C4B5FD" }}>
                            HOMIY
                        </span>
                    </div>
                    <div className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.5)" }}>Sponsored · Nexus AD</div>
                </div>
            </div>

            {/* Rasm */}
            <div className="relative aspect-[4/3] bg-black">
                <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" loading="lazy" />
            </div>

            {/* Sarlavha + body */}
            <div className="p-4">
                <h3 className="text-[16px] font-bold text-white leading-tight mb-1.5">{ad.title}</h3>
                {ad.body && (
                    <p className="text-[13px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.75)" }}>
                        {ad.body}
                    </p>
                )}
                <a
                    href={ad.ctaUrl}
                    target={ad.ctaUrl.startsWith("http") && !ad.ctaUrl.includes("forhumo.uz") ? "_blank" : "_self"}
                    rel="noopener noreferrer sponsored"
                    onClick={onCtaClick}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[13.5px] font-bold transition-transform active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff" }}
                >
                    {ad.ctaText}
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
}
