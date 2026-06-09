"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Search, Hash, Flame, Users, BadgeCheck, Loader2,
    UserPlus, UserCheck,
} from "lucide-react";

interface DUser { name: string | null; username: string | null; image: string | null; verified: boolean }
interface DTag { tag: string; count: number }

function avatarOf(image: string | null, seed: string | null) {
    return image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed || "user")}`;
}

export function NxExplore() {
    const { exploreOpen, setExploreOpen, setSearchOpen } = useNxPlayer();
    const [tags, setTags] = useState<DTag[]>([]);
    const [users, setUsers] = useState<DUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [followBusy, setFollowBusy] = useState<string | null>(null);
    const [followed, setFollowed] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!exploreOpen) return;
        setLoading(true);
        fetch("/api/nexus/discover")
            .then(r => r.json())
            .then(d => { setTags(d.trendingTags ?? []); setUsers(d.suggestedUsers ?? []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [exploreOpen]);

    const follow = useCallback(async (u: DUser) => {
        if (!u.username || followBusy) return;
        setFollowBusy(u.username);
        setFollowed(prev => new Set(prev).add(u.username!));
        try {
            await fetch("/api/nexus/follow", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u.username }),
            });
        } finally { setFollowBusy(null); }
    }, [followBusy]);

    if (!exploreOpen) return null;
    const close = () => setExploreOpen(false);

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(12px)" }} onClick={close} />

            <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                           md:w-[560px] md:max-h-[88vh] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "90vh" }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="flex items-center gap-3 mb-3">
                        <Flame className="w-5 h-5 flex-shrink-0" style={{ color: "#F97316" }} />
                        <h3 className="text-base font-black text-white flex-1">Kashfiyot</h3>
                        <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    {/* Qidiruvni ochish */}
                    <button onClick={() => { close(); setSearchOpen(true); }}
                        className="w-full flex items-center gap-3 h-10 rounded-xl px-3.5 text-left"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <Search className="w-4 h-4" style={{ color: "rgba(43,62,232,0.55)" }} />
                        <span className="text-sm" style={{ color: "rgba(140,160,210,0.7)" }}>Odamlar, postlar, #hashtag...</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : (
                        <>
                            {/* Trenddagi hashtaglar */}
                            <div className="px-4 pt-4 pb-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <Hash className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                    <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.70)" }}>Trenddagi hashtaglar</h4>
                                </div>
                                {tags.length === 0 ? (
                                    <p className="text-xs px-1" style={{ color: "rgba(120,140,185,0.6)" }}>Hali hashtag yo&apos;q</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {tags.map((t, i) => (
                                            <Link key={t.tag} href={`/nexus/tag/${t.tag}`} onClick={close}
                                                className="flex items-center gap-2.5 p-3 rounded-xl"
                                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                                <span className="text-sm font-black" style={{ color: "rgba(80,100,150,0.6)", minWidth: "16px" }}>{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                                                        <span className="text-[12px] font-bold text-white truncate">{t.tag}</span>
                                                    </div>
                                                    <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.7)" }}>{t.count} ta post</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tavsiya qilingan odamlar */}
                            <div className="px-4 pb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                    <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.70)" }}>Tavsiya qilingan odamlar</h4>
                                </div>
                                {users.length === 0 ? (
                                    <p className="text-xs px-1" style={{ color: "rgba(120,140,185,0.6)" }}>Hozircha tavsiya yo&apos;q</p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {users.map((u, i) => {
                                            const isFollowed = !!u.username && followed.has(u.username);
                                            return (
                                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                                    <Link href={u.username ? `/nexus/u/${u.username}` : "/nexus"} onClick={close} className="flex items-center gap-3 flex-1 min-w-0">
                                                        <img src={avatarOf(u.image, u.username)} alt="" className="w-10 h-10 rounded-xl object-cover bg-white flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-sm font-bold text-white truncate">{u.name || u.username || "Foydalanuvchi"}</span>
                                                                {u.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                                            </div>
                                                            {u.username && <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>@{u.username}</span>}
                                                        </div>
                                                    </Link>
                                                    {u.username && (
                                                        isFollowed ? (
                                                            <span className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 flex-shrink-0"
                                                                style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.35)", color: "rgba(160,180,240,0.9)" }}>
                                                                <UserCheck className="w-3 h-3" /> Kuzatilmoqda
                                                            </span>
                                                        ) : (
                                                            <button onClick={() => follow(u)} disabled={followBusy === u.username}
                                                                className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 flex-shrink-0 active:scale-95 transition"
                                                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }}>
                                                                <UserPlus className="w-3 h-3" /> Kuzatish
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
