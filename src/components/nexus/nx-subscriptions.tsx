"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Users, Loader2, UserMinus, UserPlus, Search, UserCheck } from "lucide-react";
import { NxVerifiedBadge } from "./nx-verified-badge";

// ─────────────────────────────────────────────────────────────────────────────
// NxSubscriptions — 2 tab: Obunalarim (following) / Kuzatuvchilarim (followers)
// ─────────────────────────────────────────────────────────────────────────────

interface FollowUser {
    name: string | null; username: string | null; image: string | null;
    verified: boolean; verifiedCategory?: string | null;
    isFollowing?: boolean; // followers tab uchun — men uni kuzatamanmi
}

function avatarOf(u: FollowUser) {
    return u.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(u.username || "user")}`;
}

export function NxSubscriptions() {
    const { subsOpen, setSubsOpen } = useNxPlayer();
    const [tab, setTab] = useState<"following" | "followers">("following");
    const [users, setUsers] = useState<FollowUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [myUsername, setMyUsername] = useState<string | null>(null);

    // O'z username'ni bir marta olamiz
    useEffect(() => {
        if (!subsOpen) return;
        fetch("/api/nexus/profile")
            .then(r => r.ok ? r.json() : null)
            .then(d => setMyUsername(d?.profile?.username ?? null))
            .catch(() => { });
    }, [subsOpen]);

    const load = useCallback(async () => {
        if (!myUsername) return;
        setLoading(true);
        try {
            const d = await fetch(`/api/nexus/follows?username=${encodeURIComponent(myUsername)}&type=${tab}`).then(r => r.json());
            setUsers(d?.users ?? []);
        } finally { setLoading(false); }
    }, [myUsername, tab]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => { if (!subsOpen) { setQuery(""); setTab("following"); } }, [subsOpen]);

    async function toggleFollow(u: FollowUser) {
        if (!u.username || busy) return;
        setBusy(u.username);
        try {
            await fetch("/api/nexus/follow", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u.username }),
            });
            if (tab === "following") {
                // Unfollow => ro'yxatdan chiqarish
                setUsers(prev => prev.filter(x => x.username !== u.username));
            } else {
                // Followers tab'da — isFollowing toggle qilinadi
                setUsers(prev => prev.map(x => x.username === u.username ? { ...x, isFollowing: !x.isFollowing } : x));
            }
        } finally { setBusy(null); }
    }

    if (!subsOpen) return null;

    // Qidiruv (client-side)
    const q = query.trim().toLowerCase();
    const filtered = q ? users.filter(u => (u.name || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q)) : users;

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }} onClick={() => setSubsOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[460px] md:max-h-[85vh] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "88vh" }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Aloqalar
                    </h2>
                    <button onClick={() => setSubsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Tab tanlash */}
                <div className="flex gap-2 px-4 pt-3 pb-2 flex-shrink-0">
                    {([
                        ["following", "Obunalarim"],
                        ["followers", "Kuzatuvchilarim"],
                    ] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setTab(id)}
                            className="flex-1 px-3 py-2 rounded-xl text-xs font-black transition active:scale-95"
                            style={tab === id
                                ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(140,160,210,0.85)" }}>
                            {label}{users.length > 0 && tab === id && <span className="ml-1 opacity-70">{users.length}</span>}
                        </button>
                    ))}
                </div>

                {/* Qidiruv */}
                <div className="px-4 pb-2 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(43,62,232,0.55)" }} />
                        <input value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Ism yoki @username..."
                            className="w-full h-9 rounded-xl pl-9 pr-9 text-sm text-white outline-none"
                            style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.20)", caretColor: "#00CEC8" }} />
                        {query && (
                            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="w-3.5 h-3.5" style={{ color: "rgba(160,180,220,0.70)" }} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex flex-col gap-2">
                            {[0,1,2,3,4].map(i => <UserSkeleton key={i} />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                            <Users className="w-10 h-10 mb-3" style={{ color: "rgba(43,62,232,0.40)" }} />
                            <p className="text-sm font-bold text-white/60 mb-1">
                                {q ? `"${query}" bo'yicha topilmadi`
                                   : tab === "following" ? "Hali hech kimni kuzatmaysiz"
                                   : "Hozircha kuzatuvchi yo'q"}
                            </p>
                            <p className="text-[11px]" style={{ color: "rgba(100,120,170,0.65)" }}>
                                {!q && tab === "following" && "Kashfiyotdan qiziqarli odamlarni toping"}
                                {!q && tab === "followers" && "Post yozing, video ulashing — sizni topishadi"}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {filtered.map(u => (
                                <div key={u.username ?? u.name ?? ""} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                    <Link href={u.username ? `/nexus/u/${u.username}` : "/nexus"} onClick={() => setSubsOpen(false)}
                                        className="flex items-center gap-3 flex-1 min-w-0">
                                        <img src={avatarOf(u)} alt="" className="w-10 h-10 rounded-xl object-cover bg-white flex-shrink-0" style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate flex items-center gap-1">
                                                {u.name || u.username || "Foydalanuvchi"}
                                                {u.verified && <NxVerifiedBadge category={u.verifiedCategory} size={13} />}
                                            </p>
                                            {u.username && <p className="text-[10px] truncate" style={{ color: "rgba(100,120,170,0.75)" }}>@{u.username}</p>}
                                        </div>
                                    </Link>
                                    {tab === "following" ? (
                                        <button onClick={() => toggleFollow(u)} disabled={busy === u.username}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black flex-shrink-0 disabled:opacity-50"
                                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(150,170,220,0.9)" }}>
                                            {busy === u.username ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                                            Bekor
                                        </button>
                                    ) : u.isFollowing ? (
                                        <button onClick={() => toggleFollow(u)} disabled={busy === u.username}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black flex-shrink-0 disabled:opacity-50"
                                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(150,170,220,0.9)" }}>
                                            {busy === u.username ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                                            Kuzatilmoqda
                                        </button>
                                    ) : (
                                        <button onClick={() => toggleFollow(u)} disabled={busy === u.username}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black flex-shrink-0 disabled:opacity-50"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }}>
                                            {busy === u.username ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                                            Kuzatish
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function UserSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl animate-pulse" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.12)" }}>
            <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: "rgba(43,62,232,0.15)" }} />
            <div className="flex-1 space-y-1.5">
                <div className="h-2.5 rounded" style={{ background: "rgba(43,62,232,0.15)", width: "50%" }} />
                <div className="h-2 rounded" style={{ background: "rgba(43,62,232,0.10)", width: "30%" }} />
            </div>
            <div className="h-7 w-20 rounded-lg flex-shrink-0" style={{ background: "rgba(43,62,232,0.10)" }} />
        </div>
    );
}
