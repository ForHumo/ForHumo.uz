"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { ArrowLeft, BadgeCheck, Loader2, Edit3, UserPlus, UserCheck, UserX, MessageCircle } from "lucide-react";
import { NxPlayerProvider } from "./nx-player-ctx";
import { NxSocialFeed } from "./nx-social-feed";
import { NxShare } from "./nx-share";
import { NexusFollowList } from "./nexus-follow-list";

interface ProfileData {
    name: string | null; username: string | null; image: string | null;
    coverImage: string | null; bio: string | null; humoId: string | null; verified: boolean;
}
interface Stats { posts: number; followers: number; following: number }
interface ProfileResp { profile: ProfileData; stats: Stats; isFollowing: boolean; isMe: boolean }

function fzNum(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

export function NexusProfile({ username }: { username: string }) {
    const router = useRouter();
    const [data, setData] = useState<ProfileResp | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [following, setFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [busy, setBusy] = useState(false);
    const [listType, setListType] = useState<"followers" | "following" | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setNotFound(false);
        try {
            const res = await fetch(`/api/nexus/profile?username=${encodeURIComponent(username)}`);
            if (!res.ok) { setNotFound(true); return; }
            const d: ProfileResp = await res.json();
            setData(d); setFollowing(d.isFollowing); setFollowerCount(d.stats.followers);
        } catch { setNotFound(true); } finally { setLoading(false); }
    }, [username]);
    useEffect(() => { load(); }, [load]);

    async function toggleFollow() {
        if (busy || !data) return;
        setBusy(true);
        const next = !following;
        setFollowing(next); setFollowerCount(c => Math.max(0, c + (next ? 1 : -1)));
        try {
            const res = await fetch("/api/nexus/follow", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });
            if (res.ok) { const r = await res.json(); setFollowing(r.following); setFollowerCount(r.followerCount); }
        } finally { setBusy(false); }
    }

    const p = data?.profile;
    const avatar = p?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    const displayName = p?.name || p?.username || username;

    return (
        <NxPlayerProvider>
            <div className="h-full overflow-y-auto text-white" style={{ background: "#050818" }}>
                {/* Top bar */}
                <header className="sticky top-0 z-20 flex items-center gap-3 px-3 h-14 backdrop-blur-xl"
                    style={{ background: "rgba(5,8,24,0.80)", borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <ArrowLeft className="w-4 h-4 text-white" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-white truncate">{displayName}</span>
                            {p?.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                        </div>
                        {!loading && data && <span className="text-[10px]" style={{ color: "rgba(120,140,185,0.7)" }}>{fzNum(data.stats.posts)} post</span>}
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                ) : notFound || !data ? (
                    <div className="flex flex-col items-center py-24 px-6 text-center">
                        <UserX className="w-12 h-12 mb-3" style={{ color: "rgba(120,140,185,0.4)" }} />
                        <p className="text-sm font-bold text-white/80">Foydalanuvchi topilmadi</p>
                        <Link href="/nexus" className="mt-4 px-5 py-2.5 rounded-xl text-xs font-black text-white"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>Nexus&apos;ga qaytish</Link>
                    </div>
                ) : (
                    <>
                        {/* Cover */}
                        <div className="relative h-32 sm:h-40 w-full overflow-hidden">
                            {data.profile.coverImage
                                ? <img src={data.profile.coverImage} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1a2a8a,#0a3d3a)" }} />}
                            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent, #050818)" }} />
                        </div>

                        {/* Profil ma'lumoti */}
                        <div className="px-4 -mt-12 relative">
                            <div className="flex items-end justify-between">
                                <div className="w-24 h-24 rounded-3xl p-[3px]" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 32px rgba(43,62,232,0.4)" }}>
                                    <img src={avatar} alt={displayName} className="w-full h-full rounded-[20px] object-cover bg-[#050818]" referrerPolicy="no-referrer" />
                                </div>
                                {/* Tugma */}
                                {data.isMe ? (
                                    <Link href="/id/edit" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black mb-1"
                                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.30)", color: "rgba(180,195,235,0.95)" }}>
                                        <Edit3 className="w-3.5 h-3.5" /> Tahrirlash
                                    </Link>
                                ) : (
                                    <div className="flex gap-2 mb-1">
                                        <button onClick={toggleFollow} disabled={busy}
                                            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black active:scale-95 transition disabled:opacity-60"
                                            style={following
                                                ? { background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.30)", color: "rgba(140,160,210,0.9)" }
                                                : { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff", boxShadow: "0 4px 18px rgba(43,62,232,0.4)" }}>
                                            {following ? <><UserCheck className="w-4 h-4" /> Kuzatilmoqda</> : <><UserPlus className="w-4 h-4" /> Kuzatish</>}
                                        </button>
                                        <Link href={`/nexus?dm=${username}`} title="Xabar"
                                            className="flex items-center justify-center w-11 rounded-xl active:scale-95 transition"
                                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                            <MessageCircle className="w-4 h-4" style={{ color: "rgba(180,195,235,0.95)" }} />
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div className="mt-3">
                                <div className="flex items-center gap-1.5">
                                    <h1 className="text-xl font-black text-white">{displayName}</h1>
                                    {data.profile.verified && <BadgeCheck className="w-5 h-5" style={{ color: "#00CEC8" }} />}
                                </div>
                                {data.profile.username && <p className="text-sm font-mono" style={{ color: "#00CEC8" }}>@{data.profile.username}</p>}
                                {data.profile.bio && <p className="text-sm mt-2 leading-relaxed" style={{ color: "rgba(180,195,235,0.8)" }}>{data.profile.bio}</p>}
                            </div>

                            {/* Statistika */}
                            <div className="flex gap-6 mt-4">
                                <div className="text-center">
                                    <p className="text-lg font-black text-white leading-tight">{fzNum(data.stats.posts)}</p>
                                    <p className="text-[10px] font-bold" style={{ color: "rgba(120,140,185,0.75)" }}>Postlar</p>
                                </div>
                                <button onClick={() => setListType("followers")} className="text-center active:scale-95 transition">
                                    <p className="text-lg font-black text-white leading-tight">{fzNum(followerCount)}</p>
                                    <p className="text-[10px] font-bold" style={{ color: "rgba(120,140,185,0.75)" }}>Kuzatuvchilar</p>
                                </button>
                                <button onClick={() => setListType("following")} className="text-center active:scale-95 transition">
                                    <p className="text-lg font-black text-white leading-tight">{fzNum(data.stats.following)}</p>
                                    <p className="text-[10px] font-bold" style={{ color: "rgba(120,140,185,0.75)" }}>Kuzatilmoqda</p>
                                </button>
                            </div>
                        </div>

                        {/* Ajratgich */}
                        <div className="mt-5 mx-4 pb-1" style={{ borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                            <span className="text-xs font-black" style={{ color: "#00CEC8" }}>Postlar</span>
                        </div>

                        {/* Postlar (NxSocialFeed reuse) */}
                        <div className="pb-28">
                            <NxSocialFeed authorUsername={username} />
                        </div>
                    </>
                )}

                {listType && data && <NexusFollowList username={username} type={listType} onClose={() => setListType(null)} />}
            </div>

            {/* Ulashish modali (feed share tugmasi uchun) */}
            <NxShare />
        </NxPlayerProvider>
    );
}
