"use client";

// BN admin boshqaruv paneli — OWNER faqat ko'radi.
// Adminlarni qo'shish, o'chirish (OWNER'ni emas), rolini o'zgartirish.

import { useEffect, useState } from "react";
import {
    UserPlus, Trash2, ShieldCheck, Shield, X, Loader2, User,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Admin {
    id: string;
    role: "OWNER" | "MODERATOR";
    note: string | null;
    createdAt: string;
    profile: {
        id: string;
        username: string | null;
        humoId: string | null;
        name: string | null;
        image: string | null;
        email: string | null;
    } | null;
}

export function BnAdminList() {
    const [items, setItems] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [openAdd, setOpenAdd] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch("/api/bn/admin/admins");
            if (r.ok) {
                const j = await r.json();
                setItems(j.admins ?? []);
            }
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function remove(id: string, isOwner: boolean) {
        if (isOwner) {
            alert("OWNER'ni olib tashlab bo'lmaydi. Bir-birimizni ololmaymiz.");
            return;
        }
        if (!confirm("Bu adminni olib tashlaysizmi?")) return;
        setBusyId(id);
        setErr(null);
        try {
            const r = await fetch(`/api/bn/admin/admins/${id}`, { method: "DELETE" });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                setErr(j.error === "cannot_remove_owner" ? "OWNER'ni olib tashlab bo'lmaydi" : "Xatolik");
            } else {
                setItems(prev => prev.filter(x => x.id !== id));
            }
        } finally { setBusyId(null); }
    }

    return (
        <div>
            {err && (
                <div className="rounded-xl px-4 py-3 mb-3 text-[13px]" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                    {err}
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <p className="text-[13px]" style={{ color: BN.text3 }}>
                    OWNER: to'liq huquq. MODERATOR: arizalar va shikoyatlar.
                </p>
                <button
                    onClick={() => setOpenAdd(true)}
                    className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-bold transition-transform active:scale-[0.98]"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    <UserPlus className="w-4 h-4" /> Admin qo&apos;shish
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
            ) : (
                <div className="space-y-2.5">
                    {items.map(a => {
                        const isOwner = a.role === "OWNER";
                        return (
                            <div
                                key={a.id}
                                className="flex items-center gap-3 rounded-2xl p-3.5"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                {/* Avatar */}
                                {a.profile?.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={a.profile.image} alt="" className="w-11 h-11 rounded-full object-cover" />
                                ) : (
                                    <div className="w-11 h-11 rounded-full grid place-items-center" style={{ background: BN.surfaceUp }}>
                                        <User className="w-5 h-5" style={{ color: BN.text3 }} />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[14px] font-bold truncate">{a.profile?.name ?? a.profile?.username ?? "—"}</p>
                                        {a.profile?.username && (
                                            <span className="text-[12px]" style={{ color: BN.text3 }}>@{a.profile.username}</span>
                                        )}
                                    </div>
                                    <p className="text-[11.5px] mt-0.5" style={{ color: BN.text3 }}>
                                        {a.profile?.humoId} · {a.note ?? "—"}
                                    </p>
                                </div>
                                <span
                                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black"
                                    style={{
                                        background: isOwner ? BN.goldSoft : "rgba(96,165,250,0.15)",
                                        color: isOwner ? BN.gold : "#60a5fa",
                                    }}
                                >
                                    {isOwner ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                    {isOwner ? "OWNER" : "MODERATOR"}
                                </span>
                                <button
                                    onClick={() => remove(a.id, isOwner)}
                                    disabled={isOwner || busyId === a.id}
                                    className="w-10 h-10 grid place-items-center rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-500/10"
                                    style={{ color: "#ef4444" }}
                                    title={isOwner ? "OWNER'ni olib tashlab bo'lmaydi" : "Olib tashlash"}
                                >
                                    {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {openAdd && (
                <AddAdminModal
                    onClose={() => setOpenAdd(false)}
                    onAdded={() => { setOpenAdd(false); load(); }}
                />
            )}
        </div>
    );
}

function AddAdminModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
    const [humoId, setHumoId] = useState("UZ");
    const [role, setRole] = useState<"OWNER" | "MODERATOR">("MODERATOR");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        setBusy(true);
        setErr(null);
        try {
            const r = await fetch("/api/bn/admin/admins", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ humoId: humoId.trim(), role, note: note.trim() || null }),
            });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                const map: Record<string, string> = {
                    bad_humo_id: "Humo ID format: UZ+7 raqam",
                    user_not_found: "Bu Humo ID li foydalanuvchi topilmadi",
                    already_admin: "Bu foydalanuvchi allaqachon admin",
                    forbidden: "Ruxsat yo'q",
                };
                setErr(map[j.error] ?? "Xatolik");
                return;
            }
            onAdded();
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[200] grid place-items-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose}>
            <div
                className="w-full max-w-[440px] rounded-3xl p-6 relative"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4" style={{ color: BN.text3 }}><X className="w-4 h-4" /></button>
                <h2 className="text-[18px] font-black mb-4">Admin qo&apos;shish</h2>

                {err && <div className="rounded-xl px-3 py-2 mb-3 text-[12.5px]" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>{err}</div>}

                <label className="text-[11px] uppercase tracking-wider font-bold" style={{ color: BN.text3 }}>Humo ID</label>
                <input
                    value={humoId}
                    onChange={(e) => setHumoId(e.target.value.toUpperCase())}
                    placeholder="UZ0000000"
                    className="w-full rounded-xl px-3 py-2.5 mt-1 mb-3 text-[14px] font-mono"
                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }}
                />

                <label className="text-[11px] uppercase tracking-wider font-bold" style={{ color: BN.text3 }}>Rol</label>
                <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
                    {(["MODERATOR", "OWNER"] as const).map(r => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            className="rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors"
                            style={{
                                background: role === r ? BN.goldSoft : BN.surfaceUp,
                                border: `1px solid ${role === r ? BN.goldEdge : BN.border}`,
                                color: role === r ? BN.gold : BN.text2,
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <label className="text-[11px] uppercase tracking-wider font-bold" style={{ color: BN.text3 }}>Izoh (ixtiyoriy)</label>
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="BN loyihasi rahbari, moderator, ..."
                    className="w-full rounded-xl px-3 py-2.5 mt-1 mb-4 text-[14px]"
                    style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }}
                />

                <button
                    onClick={submit}
                    disabled={busy || !humoId}
                    className="w-full rounded-xl h-11 font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Qo&apos;shish
                </button>
            </div>
        </div>
    );
}
