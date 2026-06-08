"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { X, BadgeCheck, Loader2 } from "lucide-react";

interface FollowUser {
    name: string | null; username: string | null; image: string | null;
    verified: boolean; isFollowing: boolean; isMe: boolean;
}

function avatarOf(u: FollowUser) {
    return u.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(u.username || "user")}`;
}

export function NexusFollowList({ username, type, onClose }: {
    username: string; type: "followers" | "following"; onClose: () => void;
}) {
    const [users, setUsers] = useState<FollowUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetch(`/api/nexus/follows?username=${encodeURIComponent(username)}&type=${type}`).then(r => r.json());
            setUsers(d.users ?? []);
        } finally { setLoading(false); }
    }, [username, type]);
    useEffect(() => { load(); }, [load]);

    async function toggleFollow(u: FollowUser) {
        if (!u.username || busy) return;
        setBusy(u.username);
        setUsers(prev => prev.map(x => x.username === u.username ? { ...x, isFollowing: !x.isFollowing } : x));
        try {
            await fetch("/api/nexus/follow", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u.username }),
            });
        } finally { setBusy(null); }
    }

    const title = type === "followers" ? "Kuzatuvchilar" : "Kuzatilmoqda";

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "rgba(8,14,32,0.98)", border: "1px solid rgba(43,62,232,0.25)", maxHeight: "75vh" }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                    <h3 className="text-sm font-black text-white">{title}</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-3.5 h-3.5 text-white/60" />
                    </button>
                </div>
                <div className="overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : users.length === 0 ? (
                        <p className="text-center py-10 text-xs" style={{ color: "rgba(120,140,185,0.7)" }}>Hozircha hech kim yo&apos;q</p>
                    ) : users.map((u, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                            <Link href={u.username ? `/nexus/u/${u.username}` : "/nexus"} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                                <img src={avatarOf(u)} alt="" className="w-10 h-10 rounded-xl object-cover bg-white flex-shrink-0" />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-bold text-white truncate">{u.name || u.username || "Foydalanuvchi"}</span>
                                        {u.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                    </div>
                                    {u.username && <span className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>@{u.username}</span>}
                                </div>
                            </Link>
                            {!u.isMe && u.username && (
                                <button onClick={() => toggleFollow(u)} disabled={busy === u.username}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-black flex-shrink-0 active:scale-95 transition"
                                    style={u.isFollowing
                                        ? { background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(140,160,210,0.85)" }
                                        : { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }}>
                                    {u.isFollowing ? "Kuzatilmoqda" : "Kuzatish"}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
