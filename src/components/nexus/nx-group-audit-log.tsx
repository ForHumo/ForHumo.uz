"use client";

// Admin audit log ro'yxati — Telegram admin log naqshi.

import { useEffect, useState } from "react";
import { X, Loader2, ScrollText, UserMinus, UserPlus, Shield, ShieldOff, Pin, PinOff, Trash2, Edit3, Check, XCircle, Clock, ShieldAlert } from "lucide-react";

const ACTION_META: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; color: string }> = {
    "kick":       { icon: UserMinus, label: "chiqarildi",  color: "#FF8E5B" },
    "ban":        { icon: ShieldOff, label: "bloklandi",   color: "#FF505A" },
    "unban":      { icon: Shield,    label: "blokdan chiqarildi", color: "var(--nx-accent)" },
    "promote":    { icon: UserPlus,  label: "admin qilindi", color: "var(--nx-accent)" },
    "demote":     { icon: UserMinus, label: "adminlikdan olindi", color: "#FFC107" },
    "pin":        { icon: Pin,       label: "pinlandi",     color: "var(--nx-accent)" },
    "unpin":      { icon: PinOff,    label: "pindan olindi",color: "#FFC107" },
    "delete-msg": { icon: Trash2,    label: "xabar o'chirildi", color: "#FF505A" },
    "delete-msg-everyone": { icon: Trash2, label: "hamma uchun o'chirildi", color: "#FF505A" },
    "change-info":{ icon: Edit3,     label: "sozlamalar o'zgardi", color: "var(--nx-accent)" },
    "approve-join":{ icon: Check,    label: "kirish qabul qilindi", color: "var(--nx-accent)" },
    "reject-join": { icon: XCircle,  label: "kirish rad etildi", color: "#FF505A" },
    "slow-mode":  { icon: Clock,     label: "slow mode",    color: "#FFC107" },
    "auto-delete":{ icon: Trash2,    label: "auto-delete",  color: "#FFC107" },
    "restrict-fwd":{ icon: ShieldAlert, label: "forward taqiqi", color: "#FFC107" },
};

type Event = {
    id: string; action: string; detail: string | null; createdAt: string;
    actor: { id: string; name: string | null; username: string | null; image: string | null } | null;
    target: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

function timeAgo(iso: string): string {
    const d = new Date(iso).getTime();
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}daq`;
    if (s < 86400) return `${Math.floor(s / 3600)}s`;
    return `${Math.floor(s / 86400)}k`;
}

export function NxGroupAuditLog({
    open, channelId, onClose,
}: {
    open: boolean;
    channelId: string;
    onClose: () => void;
}) {
    const [items, setItems] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/audit?limit=100`)
            .then(r => r.ok ? r.json() : { events: [] })
            .then(d => setItems(d.events ?? []))
            .finally(() => setLoading(false));
    }, [open, channelId]);

    if (!open) return null;
    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "var(--nx-elevated)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.3)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgb(var(--nx-accent-rgb) / 0.14)" }}>
                    <h3 className="text-base font-black text-[var(--nx-text)] flex items-center gap-2">
                        <ScrollText className="w-4 h-4" style={{ color: "var(--nx-accent)" }} /> Admin jurnali
                    </h3>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: "rgb(var(--nx-accent-rgb) / 0.12)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.22)" }}>
                        <X className="h-4 w-4 text-[var(--nx-text)]" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--nx-accent)" }} />
                        </div>
                    ) : items.length === 0 ? (
                        <p className="py-8 text-center text-xs" style={{ color: "var(--nx-text-3)" }}>Hozircha voqea yo&apos;q</p>
                    ) : items.map(e => {
                        const meta = ACTION_META[e.action] ?? { icon: Edit3, label: e.action, color: "rgb(var(--nx-text-2-rgb)/0.8)" };
                        return (
                            <div key={e.id} className="flex items-start gap-2 px-3 py-2 mb-1 rounded-xl"
                                style={{ background: "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.14)" }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}40` }}>
                                    <meta.icon className="w-4 h-4" style={{ color: meta.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-[var(--nx-text)]">
                                        <span className="font-bold">{e.actor?.name ?? e.actor?.username ?? "?"}</span>
                                        {" — "}
                                        <span style={{ color: meta.color }}>{meta.label}</span>
                                        {e.target && (
                                            <>{" · "}<span className="font-bold">{e.target.name ?? e.target.username ?? "?"}</span></>
                                        )}
                                    </p>
                                    {e.detail && <p className="text-[10px] mt-0.5 italic" style={{ color: "rgb(var(--nx-text-2-rgb)/0.7)" }}>{e.detail}</p>}
                                </div>
                                <span className="text-[10px] flex-shrink-0" style={{ color: "var(--nx-text-3)" }}>{timeAgo(e.createdAt)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
