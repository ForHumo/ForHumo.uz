"use client";

// Bu haftaning yulduzlari — TOP 50 muallif (horizontal scroll)
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Crown, Heart, MessageCircle } from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";

interface Writer {
    name: string | null; username: string | null; image: string | null;
    verified: boolean; verifiedCategory?: string | null;
    posts: number; likes: number; comments: number; score: number;
}

function avatarOf(a: { image?: string | null; username?: string | null; name?: string | null }) {
    return a.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a.username || a.name || "u")}`;
}
function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

export function NxTopWritersRow() {
    const [top, setTop] = useState<Writer[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch("/api/nexus/top-writer?limit=50")
            .then(r => r.json())
            .then(d => setTop(Array.isArray(d.top) ? d.top : []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="mt-3 mb-3">
                <div className="px-4 mb-2 flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5" style={{ color: "#F5B301" }} />
                    <span className="text-sm font-black text-white">Bu haftaning yulduzlari</span>
                </div>
                <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                    {[0,1,2,3,4].map(i => (
                        <div key={i} className="w-24 flex-shrink-0 flex flex-col items-center gap-1.5 animate-pulse">
                            <div className="w-16 h-16 rounded-2xl" style={{ background: "rgba(245,179,1,0.15)" }} />
                            <div className="h-2.5 w-14 rounded" style={{ background: "rgba(245,179,1,0.10)" }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (top.length === 0) return null;

    return (
        <div className="mt-3 mb-3">
            <div className="px-4 mb-2 flex items-center gap-2">
                <Crown className="w-3.5 h-3.5" style={{ color: "#F5B301" }} />
                <span className="text-sm font-black text-white">Bu haftaning yulduzlari</span>
                <span className="text-[10px] ml-auto" style={{ color: "rgba(245,179,1,0.75)" }}>TOP 50</span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                {top.map((w, i) => (
                    <Link key={w.username} href={`/nexus/u/${w.username}`}
                        className="w-24 flex-shrink-0 flex flex-col items-center gap-1.5 group active:scale-95 transition-transform">
                        <div className="relative">
                            {/* Rank raqami */}
                            <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white z-10"
                                style={{
                                    background: i === 0 ? "linear-gradient(135deg,#F5B301,#F97316)"
                                        : i === 1 ? "linear-gradient(135deg,#C0C0C0,#9CA3AF)"
                                        : i === 2 ? "linear-gradient(135deg,#B08D57,#8B6B3E)"
                                        : "rgba(43,62,232,0.85)",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                                }}>
                                {i + 1}
                            </div>
                            {/* Avatar (Crown 1-o'rin uchun) */}
                            <div className="w-16 h-16 rounded-2xl overflow-hidden"
                                style={{
                                    border: i === 0 ? "2.5px solid #F5B301"
                                        : i === 1 ? "2.5px solid #C0C0C0"
                                        : i === 2 ? "2.5px solid #B08D57"
                                        : "1.5px solid rgba(43,62,232,0.30)",
                                    boxShadow: i < 3 ? `0 0 12px ${i === 0 ? "rgba(245,179,1,0.35)" : i === 1 ? "rgba(192,192,192,0.30)" : "rgba(176,141,87,0.30)"}` : undefined,
                                }}>
                                <img src={avatarOf(w)} alt="" className="w-full h-full object-cover bg-white" />
                            </div>
                            {i === 0 && (
                                <Crown className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4" style={{ color: "#F5B301", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
                            )}
                        </div>
                        <div className="text-center min-w-0 w-full">
                            <div className="flex items-center justify-center gap-0.5">
                                <span className="text-[11px] font-black text-white truncate">{w.name || w.username}</span>
                                {w.verified && <NxVerifiedBadge category={w.verifiedCategory} size={10} />}
                            </div>
                            <div className="flex items-center justify-center gap-1.5 text-[9px] mt-0.5" style={{ color: "rgba(140,160,210,0.75)" }}>
                                <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" style={{ color: "#EF4444" }} />{fmtN(w.likes)}</span>
                                <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" style={{ color: "#00CEC8" }} />{fmtN(w.comments)}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
