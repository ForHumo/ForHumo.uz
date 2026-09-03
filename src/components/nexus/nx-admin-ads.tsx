"use client";

// Nexus admin — reklamalar moderatsiyasi (BN AdminAds ni Nexus dizayn bilan).
// 3 tab: Aktiv / Yashirilgan / Muddati o'tgan.

import { useState, useEffect, useCallback } from "react";
import {
    ImageIcon, EyeOff, Eye, Loader2, ExternalLink, TrendingUp, MousePointerClick, AlertTriangle, Clock, X, Sparkles,
} from "lucide-react";

const NX_GRADIENT = "linear-gradient(135deg, #2B3EE8 0%, #6D28D9 50%, #EC4899 100%)";
const NX_BG = "rgba(255,255,255,0.05)";
const NX_BORDER = "rgba(255,255,255,0.10)";

interface AdRow {
    id: string;
    slot: number;
    imageUrl: string;
    title: string;
    body: string | null;
    ctaUrl: string;
    ctaText: string;
    ownerUsername: string | null;
    ownerAvatar: string | null;
    startsAt: string;
    expiresAt: string;
    active: boolean;
    hidden: boolean;
    moderationNote: string | null;
    daysCount: number;
    paidAmountUzs: number;
    impressions: number;
    clicks: number;
    ctr: number;
    createdAt: string;
}

type Filter = "active" | "hidden" | "expired";

const TABS: Array<{ key: Filter; label: string }> = [
    { key: "active",  label: "Aktiv" },
    { key: "hidden",  label: "Yashirilgan" },
    { key: "expired", label: "Muddati o'tgan" },
];

export function NxAdminAds() {
    const [filter, setFilter] = useState<Filter>("active");
    const [rows, setRows] = useState<AdRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
    const [hideTarget, setHideTarget] = useState<AdRow | null>(null);
    const [hideNote, setHideNote] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/nexus/admin/ads?status=${filter}`, { cache: "no-store" });
            const d = await r.json();
            if (Array.isArray(d?.ads)) setRows(d.ads);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    async function hide() {
        if (!hideTarget) return;
        const id = hideTarget.id;
        setBusyIds(s => new Set([...s, id]));
        try {
            const r = await fetch(`/api/nexus/admin/ads/${id}/hide`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ note: hideNote.trim() || undefined }),
            });
            if (r.ok) {
                setRows(prev => prev.filter(x => x.id !== id));
                setHideTarget(null);
                setHideNote("");
            }
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    async function unhide(id: string) {
        setBusyIds(s => new Set([...s, id]));
        try {
            const r = await fetch(`/api/nexus/admin/ads/${id}/unhide`, { method: "POST" });
            if (r.ok) setRows(prev => prev.filter(x => x.id !== id));
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {TABS.map(tab => {
                    const active = filter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className="h-10 px-4 rounded-xl text-[13px] font-black flex-shrink-0 text-white"
                            style={{
                                background: active ? NX_GRADIENT : NX_BG,
                                border: `1px solid ${active ? "transparent" : NX_BORDER}`,
                                boxShadow: active ? "0 4px 14px rgba(109,40,217,0.35)" : "none",
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-white/60" />
                </div>
            )}

            {!loading && rows.length === 0 && (
                <div
                    className="p-8 rounded-3xl text-center text-[13px] text-white/60"
                    style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}
                >
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Hozircha bo&apos;sh
                </div>
            )}

            {rows.map(b => (
                <AdCard
                    key={b.id}
                    b={b}
                    busy={busyIds.has(b.id)}
                    onHide={() => { setHideTarget(b); setHideNote(""); }}
                    onUnhide={() => unhide(b.id)}
                />
            ))}

            {hideTarget && (
                <HideModal
                    banner={hideTarget}
                    note={hideNote}
                    setNote={setHideNote}
                    onClose={() => { setHideTarget(null); setHideNote(""); }}
                    onConfirm={hide}
                    busy={busyIds.has(hideTarget.id)}
                />
            )}
        </div>
    );
}

function AdCard({ b, busy, onHide, onUnhide }: {
    b: AdRow;
    busy: boolean;
    onHide: () => void;
    onUnhide: () => void;
}) {
    const now = Date.now();
    const expiresIn = new Date(b.expiresAt).getTime() - now;
    const daysLeft = Math.max(0, Math.ceil(expiresIn / (24 * 3600 * 1000)));
    const isExpired = expiresIn <= 0;

    return (
        <div
            className="p-4 rounded-2xl text-white"
            style={{
                background: NX_BG,
                border: `1px solid ${b.hidden ? "rgba(248,113,113,0.35)" : NX_BORDER}`,
                opacity: b.hidden ? 0.85 : 1,
            }}
        >
            <div className="flex gap-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={b.imageUrl}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-black leading-none tracking-wider"
                            style={{ background: NX_GRADIENT }}
                        >
                            SLOT {b.slot}
                        </span>
                        {b.hidden && (
                            <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-black leading-none flex items-center gap-1"
                                style={{ background: "rgba(248,113,113,0.18)", color: "#f87171" }}
                            >
                                <EyeOff className="w-3 h-3" /> YASHIRINGAN
                            </span>
                        )}
                        {!isExpired && !b.hidden && (
                            <span className="text-[11px] flex items-center gap-1 text-white/50">
                                <Clock className="w-3 h-3" /> {daysLeft} kun qoldi
                            </span>
                        )}
                    </div>
                    <p className="text-[13.5px] font-black line-clamp-1">{b.title}</p>
                    {b.body && <p className="text-[11.5px] text-white/60 line-clamp-1 mt-0.5">{b.body}</p>}
                    <a
                        href={b.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] flex items-center gap-1 mt-1 truncate text-white/60 hover:text-white"
                    >
                        <ExternalLink className="w-3 h-3" /> {b.ctaUrl}
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat icon={<Eye className="w-3 h-3" />} label="Ko'rish" value={b.impressions.toLocaleString()} />
                <Stat icon={<MousePointerClick className="w-3 h-3" />} label="Bosish" value={b.clicks.toLocaleString()} />
                <Stat icon={<TrendingUp className="w-3 h-3" />} label="CTR" value={`${b.ctr.toFixed(2)}%`} />
            </div>

            <div
                className="p-2.5 rounded-lg mb-3 text-[11.5px] flex items-center justify-between text-white/70"
                style={{ background: "rgba(255,255,255,0.03)" }}
            >
                <span>
                    {b.ownerUsername ? `@${b.ownerUsername}` : "?"}
                </span>
                <span className="font-black tabular-nums">
                    {b.paidAmountUzs.toLocaleString()} so&apos;m / {b.daysCount} kun
                </span>
            </div>

            {b.hidden && b.moderationNote && (
                <div
                    className="p-2.5 rounded-lg mb-3 text-[12px] flex items-start gap-2"
                    style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}
                >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{b.moderationNote}</span>
                </div>
            )}

            <div className="flex items-center gap-2">
                {b.hidden ? (
                    <button
                        onClick={onUnhide}
                        disabled={busy}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-black disabled:opacity-60 text-white"
                        style={{ background: NX_GRADIENT }}
                    >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Eye className="w-3.5 h-3.5" /> Qayta ochish</>}
                    </button>
                ) : (
                    <button
                        onClick={onHide}
                        disabled={busy || isExpired}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-black disabled:opacity-60"
                        style={{ background: "rgba(248,113,113,0.18)", color: "#f87171" }}
                    >
                        <EyeOff className="w-3.5 h-3.5" /> Yashirish
                    </button>
                )}
            </div>
        </div>
    );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px] flex items-center gap-1 mb-0.5 text-white/55">
                {icon} {label}
            </p>
            <p className="text-[13px] font-black tabular-nums">{value}</p>
        </div>
    );
}

function HideModal({ banner, note, setNote, onClose, onConfirm, busy }: {
    banner: AdRow;
    note: string;
    setNote: (v: string) => void;
    onClose: () => void;
    onConfirm: () => void;
    busy: boolean;
}) {
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-3xl p-5 text-white"
                style={{ background: "#0a0f1e", border: `1px solid ${NX_BORDER}` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4" style={{ color: "#EC4899" }} />
                    <p className="text-[15px] font-black">Reklamani yashirish</p>
                </div>
                <p className="text-[12.5px] mb-4 text-white/60">
                    Reklama darhol o&apos;chiriladi (3 slotdan biri bo&apos;shaydi). Qolgan kunlar uchun to&apos;lov qaytariladi.
                </p>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 300))}
                    rows={3}
                    placeholder="Sabab (ixtiyoriy — sohib ko'radi)"
                    className="w-full p-3 rounded-xl text-[13px] resize-none focus:outline-none text-white"
                    style={{
                        background: NX_BG,
                        border: `1px solid ${NX_BORDER}`,
                    }}
                />
                <p className="text-[10.5px] mt-1 text-right tabular-nums text-white/40">
                    {note.length}/300
                </p>

                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl text-[13px] font-black text-white"
                        style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}
                    >
                        Ortga
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5 text-white"
                        style={{ background: "#dc2626" }}
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><EyeOff className="w-4 h-4" /> Yashirish</>}
                    </button>
                </div>
                <p className="text-[10.5px] mt-3 text-center text-white/40">
                    #{banner.id.slice(0, 8)} · {banner.title.slice(0, 40)}
                </p>
            </div>
        </div>
    );
}
