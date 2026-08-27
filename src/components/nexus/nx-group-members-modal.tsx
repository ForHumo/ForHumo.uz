"use client";

// Guruh/kanal a'zolari modali. OWNER — promote/demote/kick qila oladi.
// Boshqa a'zolar faqat ro'yxatni ko'radi.

import { useEffect, useState } from "react";
import { X, Crown, Shield, UserX, UserCheck, Loader2, BadgeCheck, ShieldOff, EyeOff } from "lucide-react";

type Member = {
    profileId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    name: string | null;
    username: string | null;
    image: string | null;
    verified: boolean;
    isAnonymous?: boolean;
    online?: boolean;
    lastSeenAt?: string | null;
};

function timeAgo(iso: string | null | undefined): string {
    if (!iso) return "kirmagan";
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} kun oldin`;
    return "uzoq";
}

export function NxGroupMembersModal({
    open, channelId, onClose,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
}) {
    const [members, setMembers] = useState<Member[]>([]);
    const [canManage, setCanManage] = useState(false);
    const [canPromote, setCanPromote] = useState(false);
    const [myId, setMyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        Promise.all([
            fetch(`/api/nexus/channels/${channelId}/members`).then(r => r.ok ? r.json() : { members: [], canManage: false, canPromote: false }),
            fetch(`/api/user/profile`).then(r => r.ok ? r.json() : null).catch(() => null),
        ])
            .then(([d, prof]) => {
                setMembers(d.members ?? []);
                setCanManage(!!d.canManage);
                setCanPromote(!!d.canPromote);
                if (prof?.profile?.id) setMyId(prof.profile.id);
            })
            .finally(() => setLoading(false));
    }, [open, channelId]);

    if (!open) return null;

    const setRole = async (profileId: string, role: "ADMIN" | "MEMBER") => {
        setBusy(profileId);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/members`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId, role }),
            });
            if (r.ok) {
                setMembers(prev => prev.map(m => m.profileId === profileId ? { ...m, role } : m));
            }
        } finally { setBusy(null); }
    };

    const kick = async (profileId: string) => {
        if (!confirm("A'zoni guruhdan chiqarasizmi?")) return;
        setBusy(profileId);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/members?profileId=${profileId}`, { method: "DELETE" });
            if (r.ok) setMembers(prev => prev.filter(m => m.profileId !== profileId));
        } finally { setBusy(null); }
    };

    const ban = async (profileId: string) => {
        const reason = prompt("Ban sababi (ixtiyoriy):") ?? "";
        if (!confirm("A'zoni doimiy bloklaysizmi? U guruhga qayta kirolmaydi.")) return;
        setBusy(profileId);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/bans`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId, reason: reason || undefined }),
            });
            if (r.ok) setMembers(prev => prev.filter(m => m.profileId !== profileId));
        } finally { setBusy(null); }
    };

    const toggleAnonymous = async () => {
        // Faqat o'zim uchun (ADMIN bo'lsam)
        const my = members.find(m => m.profileId === myId);
        if (!my || my.role !== "ADMIN") return;
        setBusy(myId);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/members`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId: myId, isAnonymous: !my.isAnonymous }),
            });
            if (r.ok) {
                setMembers(prev => prev.map(m => m.profileId === myId ? { ...m, isAnonymous: !m.isAnonymous } : m));
            }
        } finally { setBusy(null); }
    };

    const filtered = q.trim()
        ? members.filter(m =>
            m.name?.toLowerCase().includes(q.toLowerCase()) ||
            m.username?.toLowerCase().includes(q.toLowerCase())
        )
        : members;

    const roleWeight: Record<Member["role"], number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    const sorted = [...filtered].sort((a, b) => roleWeight[a.role] - roleWeight[b.role]);

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[420px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.3)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white">A&apos;zolar · {members.length}</h3>
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="h-4 w-4 text-white" />
                    </button>
                </div>

                <div className="px-4 pt-3 pb-2">
                    <input value={q} onChange={e => setQ(e.target.value)}
                        placeholder="A'zoni qidiring..."
                        className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                        style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }} />
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} />
                        </div>
                    ) : sorted.length === 0 ? (
                        <p className="py-8 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>A&apos;zo topilmadi</p>
                    ) : (
                        sorted.map(m => (
                            <div key={m.profileId}
                                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 mb-1"
                                style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                <div className="relative flex-shrink-0">
                                    <img src={m.image ?? "/logos/forhumo.png"} alt=""
                                        className="w-10 h-10 rounded-full object-cover"
                                        style={{ border: "1px solid rgba(43,62,232,0.25)" }} />
                                    {m.online && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                                            style={{ background: "#22C55E", border: "2px solid rgba(8,12,32,0.99)" }} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-bold text-white truncate">
                                            {m.name ?? m.username ?? "Foydalanuvchi"}
                                        </p>
                                        {m.isAnonymous && (
                                            <EyeOff className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(140,160,210,0.7)" }} />
                                        )}
                                        {m.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                                        {m.role === "OWNER" && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                                style={{ background: "rgba(255,193,7,0.15)", color: "#FFC107" }}>
                                                <Crown className="w-3 h-3 inline mr-0.5" />EGA
                                            </span>
                                        )}
                                        {m.role === "ADMIN" && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                                style={{ background: "rgba(0,206,200,0.15)", color: "#00CEC8" }}>
                                                <Shield className="w-3 h-3 inline mr-0.5" />ADMIN
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px]" style={{ color: "rgba(120,140,185,0.7)" }}>
                                        {m.username ? `@${m.username}` : ""}
                                        {m.username && (m.online || m.lastSeenAt) ? " · " : ""}
                                        {m.online ? <span style={{ color: "#22C55E" }}>online</span> : timeAgo(m.lastSeenAt)}
                                    </p>
                                </div>
                                {/* Anonymous toggle — o'z ADMIN a'zoligi uchun */}
                                {myId === m.profileId && m.role === "ADMIN" && (
                                    <button onClick={toggleAnonymous} disabled={busy === m.profileId}
                                        title={m.isAnonymous ? "Anonim rejim yoqilgan" : "Anonim rejim"}
                                        className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                                        style={m.isAnonymous
                                            ? { background: "rgba(255,193,7,0.15)", border: "1px solid rgba(255,193,7,0.35)" }
                                            : { background: "rgba(140,160,210,0.10)" }}>
                                        <EyeOff className="w-4 h-4" style={{ color: m.isAnonymous ? "#FFC107" : "rgba(140,160,210,0.7)" }} />
                                    </button>
                                )}
                                {canManage && m.role !== "OWNER" && (
                                    <div className="flex gap-1">
                                        {canPromote && (m.role === "MEMBER" ? (
                                            <button disabled={busy === m.profileId}
                                                onClick={() => setRole(m.profileId, "ADMIN")}
                                                title="Admin qilish"
                                                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                                                style={{ background: "rgba(0,206,200,0.1)", border: "1px solid rgba(0,206,200,0.3)" }}>
                                                <UserCheck className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                            </button>
                                        ) : (
                                            <button disabled={busy === m.profileId}
                                                onClick={() => setRole(m.profileId, "MEMBER")}
                                                title="Adminlikdan olish"
                                                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                                                style={{ background: "rgba(140,160,210,0.1)", border: "1px solid rgba(140,160,210,0.3)" }}>
                                                <Shield className="w-4 h-4" style={{ color: "rgba(140,160,210,0.9)" }} />
                                            </button>
                                        ))}
                                        <button disabled={busy === m.profileId}
                                            onClick={() => kick(m.profileId)}
                                            title="Chiqarish"
                                            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                                            style={{ background: "rgba(255,140,80,0.1)", border: "1px solid rgba(255,140,80,0.3)" }}>
                                            <UserX className="w-4 h-4" style={{ color: "#FF8E5B" }} />
                                        </button>
                                        <button disabled={busy === m.profileId}
                                            onClick={() => ban(m.profileId)}
                                            title="Bloklash (doimiy)"
                                            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                                            style={{ background: "rgba(255,80,90,0.1)", border: "1px solid rgba(255,80,90,0.3)" }}>
                                            <ShieldOff className="w-4 h-4" style={{ color: "#FF505A" }} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
