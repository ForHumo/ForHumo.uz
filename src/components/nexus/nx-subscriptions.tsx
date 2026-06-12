"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Users, Loader2, BadgeCheck, UserMinus } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxSubscriptions — REAL: men kuzatayotgan odamlar ro'yxati (NexusFollow).
// ─────────────────────────────────────────────────────────────────────────────

interface FollowUser {
    name: string | null; username: string | null; image: string | null; verified: boolean;
}

function avatarOf(u: FollowUser) {
    return u.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(u.username || "user")}`;
}

export function NxSubscriptions() {
    const { subsOpen, setSubsOpen } = useNxPlayer();
    const [users, setUsers] = useState<FollowUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        if (!subsOpen) return;
        setLoading(true);
        // Avval o'z username'imni olamiz, keyin kuzatuvlar ro'yxati
        fetch("/api/nexus/profile")
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const u = d?.profile?.username;
                if (!u) { setUsers([]); return null; }
                return fetch(`/api/nexus/follows?username=${encodeURIComponent(u)}&type=following`).then(r => r.json());
            })
            .then(d => { if (d?.users) setUsers(d.users); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [subsOpen]);

    async function unfollow(u: FollowUser) {
        if (!u.username || busy) return;
        setBusy(u.username);
        try {
            await fetch("/api/nexus/follow", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u.username }),
            });
            setUsers(prev => prev.filter(x => x.username !== u.username));
        } finally { setBusy(null); }
    }

    if (!subsOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }} onClick={() => setSubsOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:max-h-[80vh] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "85vh" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Obunalarim {users.length > 0 && <span className="text-xs font-bold" style={{ color: "rgba(100,120,170,0.7)" }}>{users.length}</span>}
                    </h2>
                    <button onClick={() => setSubsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                            <Users className="w-8 h-8 mb-3" style={{ color: "rgba(43,62,232,0.40)" }} />
                            <p className="text-xs" style={{ color: "rgba(130,150,200,0.75)" }}>
                                Hali hech kimni kuzatmaysiz — Kashfiyotdan odamlarni toping
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {users.map(u => (
                                <div key={u.username ?? u.name ?? ""} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                    <Link href={u.username ? `/nexus/u/${u.username}` : "/nexus"} onClick={() => setSubsOpen(false)}
                                        className="flex items-center gap-3 flex-1 min-w-0">
                                        <img src={avatarOf(u)} alt="" className="w-10 h-10 rounded-xl object-cover bg-white flex-shrink-0" style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate flex items-center gap-1">
                                                {u.name || u.username || "Foydalanuvchi"}
                                                {u.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                            </p>
                                            {u.username && <p className="text-[10px] truncate" style={{ color: "rgba(100,120,170,0.75)" }}>@{u.username}</p>}
                                        </div>
                                    </Link>
                                    <button onClick={() => unfollow(u)} disabled={busy === u.username}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black flex-shrink-0 disabled:opacity-50"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(150,170,220,0.9)" }}>
                                        {busy === u.username ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                                        Bekor qilish
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
