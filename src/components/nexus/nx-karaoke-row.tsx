"use client";

// Nexus home "TOP karaoke ijrolari" qatori. Har hafta eng yuqori scored va
// like'lar bo'yicha (backend GET /api/nexus/karaoke/performances?scope=trending).
// Kartochka: trek muqovasi + ijrochi + ball chip (oltin/turkuaz/binafsha).

import { useEffect, useState } from "react";
import { Mic2, Play, Heart, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Performance {
    id: string; audioUrl: string; durationSec: number; score: number;
    caption: string | null; plays: number; likeCount: number;
    isLiked: boolean; duetOfId: string | null;
    performer: { name: string | null; username: string | null; image: string | null } | null;
    track: { id: string; title: string; artist: string | null; coverUrl: string | null } | null;
}

function scoreColor(score: number): { bg: string; fg: string } {
    if (score >= 80) return { bg: "rgba(245,179,1,0.25)", fg: "#F5B301" };
    if (score >= 60) return { bg: "rgba(20,184,166,0.22)", fg: "#14B8A6" };
    return { bg: "rgba(139,92,246,0.22)", fg: "#A78BFA" };
}

export function NxKaraokeRow() {
    const [items, setItems] = useState<Performance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/api/nexus/karaoke/performances?scope=trending&limit=12");
                if (!r.ok) throw new Error();
                const d = await r.json();
                setItems(Array.isArray(d.performances) ? d.performances : []);
            } catch { setItems([]); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading || items.length === 0) return null;

    return (
        <section className="mt-8 mb-4">
            <div className="flex items-center gap-3 px-4 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                    <Mic2 className="w-4.5 h-4.5" style={{ color: "#A78BFA" }} />
                </div>
                <div className="flex-1">
                    <div className="text-[16px] font-bold text-white">TOP karaoke ijrolari</div>
                    <div className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                        Eng yuqori ball va like — haftalik top
                    </div>
                </div>
                <Link href="/nexus/karaoke" className="hidden sm:flex items-center gap-1 text-[12.5px] font-semibold" style={{ color: "#A78BFA" }}>
                    Barchasi <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
                {items.map(p => {
                    const cover = p.track?.coverUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(p.track?.id || p.id)}`;
                    const perfName = p.performer?.name || p.performer?.username || "Ijrochi";
                    const badge = scoreColor(p.score);
                    return (
                        <Link
                            key={p.id}
                            href={`/nexus/karaoke/${p.id}`}
                            className="shrink-0 w-[150px] group"
                        >
                            <div className="relative w-[150px] h-[150px] rounded-2xl overflow-hidden mb-2"
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(139,92,246,0.25)" }}>
                                <img src={cover} alt={p.track?.title ?? ""} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)" }} />
                                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-black tabular-nums"
                                    style={{ background: badge.bg, color: badge.fg }}>
                                    {p.score}
                                </div>
                                {p.duetOfId && (
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold text-white"
                                        style={{ background: "rgba(139,92,246,0.75)" }}>
                                        DUET
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 text-[10px] text-white">
                                    <span className="inline-flex items-center gap-0.5"><Play className="w-3 h-3" fill="currentColor" />{p.plays.toLocaleString()}</span>
                                    <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" fill={p.isLiked ? "#EF4444" : "none"} style={{ color: p.isLiked ? "#EF4444" : undefined }} />{p.likeCount}</span>
                                </div>
                            </div>
                            <div className="text-[12.5px] font-semibold text-white line-clamp-1">{p.track?.title ?? "Karaoke"}</div>
                            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{perfName}</div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
