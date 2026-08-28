"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Hash, Flame, TrendingUp, UserPlus, Check, Crown, Heart, MessageCircle } from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";

interface Trend { tag: string; count: number }
interface Sug {
    name: string | null; username: string | null; image: string | null;
    verified: boolean; verifiedCategory?: string | null;
}
interface Writer {
    name: string | null; username: string | null; image: string | null;
    verified: boolean; verifiedCategory?: string | null;
    posts: number; likes: number; comments: number;
}

function avatarOf(a: { username?: string | null; name?: string | null; image?: string | null }) {
    return a.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a.username || a.name || "u")}`;
}

// Bugungi trending banner (H-13) + Kim kuzatishga arziydi (H-18) — Bosh sahifa uchun
export function NxTrendingBanner() {
    const [trends, setTrends] = useState<Trend[]>([]);
    const [sugs, setSugs] = useState<Sug[]>([]);
    const [writer, setWriter] = useState<Writer | null>(null);
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetch("/api/nexus/discover").then(r => r.json()).then(d => {
            setTrends((d.trendingTags ?? []).slice(0, 3));
            setSugs((d.suggestedUsers ?? []).slice(0, 6));
        }).catch(() => { });
        fetch("/api/nexus/top-writer").then(r => r.json()).then(d => setWriter(d.writer ?? null)).catch(() => { });
    }, []);

    async function toggleFollow(username: string) {
        if (!username) return;
        setFollowing(prev => {
            const nx = new Set(prev);
            if (nx.has(username)) nx.delete(username); else nx.add(username);
            return nx;
        });
        await fetch("/api/nexus/follow", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
        }).catch(() => { });
    }
    function dismiss(username: string) {
        setDismissed(prev => new Set(prev).add(username));
    }

    const visibleSugs = sugs.filter(s => s.username && !dismissed.has(s.username));
    if (trends.length === 0 && visibleSugs.length === 0 && !writer) return null;

    return (
        <div className="mt-2 mb-2 flex flex-col gap-3">
            {/* H-19: Bu haftaning eng aktiv muallifi */}
            {writer && writer.username && (
                <Link href={`/nexus/u/${writer.username}`}
                    className="mx-4 rounded-2xl overflow-hidden active:scale-[0.99] transition-transform block"
                    style={{ background: "linear-gradient(135deg, rgba(245,179,1,0.14), rgba(245,158,11,0.10))",
                        border: "1px solid rgba(245,179,1,0.35)" }}>
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(245,179,1,0.55)" }}>
                                <img src={avatarOf(writer)} alt="" className="w-full h-full object-cover bg-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg,#F5B301,#F97316)", border: "2px solid #050818" }}>
                                <Crown className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: "#F5B301" }}>Bu haftaning yulduzi</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-sm font-black text-white truncate">{writer.name ?? writer.username}</span>
                                {writer.verified && <NxVerifiedBadge category={writer.verifiedCategory} size={13} />}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] mt-0.5" style={{ color: "rgba(200,180,140,0.85)" }}>
                                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" style={{ color: "#EF4444" }} />{writer.likes}</span>
                                <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" style={{ color: "#00CEC8" }} />{writer.comments}</span>
                                <span>{writer.posts} post</span>
                            </div>
                        </div>
                    </div>
                </Link>
            )}

            {/* H-13: Trending banner */}
            {trends.length > 0 && (
                <div className="mx-4 rounded-2xl overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(139,92,246,0.10))",
                        border: "1px solid rgba(239,68,68,0.25)" }}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                        <Flame className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                        <span className="text-xs font-black text-white">Bugungi trending</span>
                        <TrendingUp className="w-3 h-3 ml-auto" style={{ color: "rgba(160,180,230,0.60)" }} />
                    </div>
                    <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1" style={{ scrollbarWidth: "none" }}>
                        {trends.map((t, i) => (
                            <Link key={t.tag} href={`/nexus/tag/${t.tag}`}
                                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl active:scale-95 transition-transform"
                                style={{ background: "rgba(8,14,32,0.65)", border: "1px solid rgba(239,68,68,0.30)" }}>
                                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
                                    style={{ background: i === 0 ? "linear-gradient(135deg,#EF4444,#F97316)"
                                        : i === 1 ? "linear-gradient(135deg,#F97316,#F5B301)"
                                        : "linear-gradient(135deg,#F5B301,#8B5CF6)" }}>{i + 1}</span>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black text-white truncate flex items-center gap-0.5">
                                        <Hash className="w-3 h-3" style={{ color: "#EF4444" }} />{t.tag}
                                    </span>
                                    <span className="text-[9px]" style={{ color: "rgba(140,160,210,0.75)" }}>{t.count} post</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* H-18: Kim kuzatishga arziydi */}
            {visibleSugs.length > 0 && (
                <div className="mx-4 rounded-2xl overflow-hidden"
                    style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.20)" }}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                        <UserPlus className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                        <span className="text-xs font-black text-white">Kim kuzatishga arziydi</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1" style={{ scrollbarWidth: "none" }}>
                        {visibleSugs.map(s => {
                            const isF = following.has(s.username!);
                            return (
                                <div key={s.username} className="flex-shrink-0 w-36 rounded-xl p-3 relative"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                    <button onClick={() => dismiss(s.username!)}
                                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                                        style={{ background: "rgba(8,14,32,0.7)", color: "rgba(140,160,210,0.60)" }}>×</button>
                                    <Link href={`/nexus/u/${s.username}`} className="block">
                                        <div className="w-12 h-12 mx-auto rounded-2xl overflow-hidden mb-2" style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                                            <img src={avatarOf(s)} alt="" className="w-full h-full object-cover bg-white" />
                                        </div>
                                        <div className="text-center flex items-center justify-center gap-1">
                                            <span className="text-[11px] font-black text-white truncate">{s.name ?? s.username}</span>
                                            {s.verified && <NxVerifiedBadge category={s.verifiedCategory} size={11} />}
                                        </div>
                                        <p className="text-center text-[9px] truncate" style={{ color: "rgba(80,100,150,0.75)" }}>@{s.username}</p>
                                    </Link>
                                    <button onClick={() => toggleFollow(s.username!)}
                                        className="mt-2 w-full py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 transition-transform"
                                        style={isF
                                            ? { background: "rgba(0,206,200,0.10)", border: "1px solid rgba(0,206,200,0.35)", color: "#00CEC8" }
                                            : { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }}>
                                        {isF ? <><Check className="w-3 h-3" />Kuzatilmoqda</> : <><UserPlus className="w-3 h-3" />Kuzatish</>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
