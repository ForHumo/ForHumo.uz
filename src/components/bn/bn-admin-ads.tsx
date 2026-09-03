"use client";

// BN admin — reklamalar moderatsiyasi (K7).
// 3 tab: Aktiv / Yashirilgan / Muddati o'tgan.
// Har banner uchun preview + statistika + Hide/Unhide action.

import { useState, useEffect, useCallback } from "react";
import {
    ImageIcon, EyeOff, Eye, Loader2, ExternalLink, TrendingUp, MousePointerClick, AlertTriangle, Clock,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface AdOwner {
    username: string | null;
    humoId: string | null;
    email: string | null;
}

interface AdRow {
    id: string;
    slot: number;
    imageUrl: string;
    title: string;
    ctaUrl: string;
    shopSlug: string | null;
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
    owner: AdOwner | null;
}

type Filter = "active" | "hidden" | "expired";

const TABS: Array<{ key: Filter; label: string }> = [
    { key: "active",  label: "Aktiv" },
    { key: "hidden",  label: "Yashirilgan" },
    { key: "expired", label: "Muddati o'tgan" },
];

export function BnAdminAds() {
    const [filter, setFilter] = useState<Filter>("active");
    const [rows, setRows] = useState<AdRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
    const [hideTarget, setHideTarget] = useState<AdRow | null>(null);
    const [hideNote, setHideNote] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/bn/admin/ads?status=${filter}`, { cache: "no-store" });
            const d = await r.json();
            if (Array.isArray(d?.banners)) setRows(d.banners);
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
            const r = await fetch(`/api/bn/admin/ads/${id}/hide`, {
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
            const r = await fetch(`/api/bn/admin/ads/${id}/unhide`, { method: "POST" });
            if (r.ok) setRows(prev => prev.filter(x => x.id !== id));
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    return (
        <div className="space-y-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setFilter(t.key)}
                        className="h-10 px-4 rounded-xl text-[13px] font-bold flex-shrink-0"
                        style={{
                            background: filter === t.key ? BN.goldSoft : BN.surface,
                            color: filter === t.key ? BN.gold : BN.text2,
                            border: `1px solid ${filter === t.key ? BN.borderGold : BN.border}`,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: BN.gold }} />
                </div>
            )}

            {!loading && rows.length === 0 && (
                <div className="p-8 rounded-2xl text-center text-[13px]" style={{ background: BN.surface, color: BN.text3, border: `1px solid ${BN.border}` }}>
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Hozircha bo'sh
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
            className="p-4 rounded-2xl"
            style={{
                background: BN.surface,
                border: `1px solid ${b.hidden ? `${BN.err}55` : BN.border}`,
                opacity: b.hidden ? 0.85 : 1,
            }}
        >
            <div className="flex gap-3 mb-3">
                <span
                    className="w-24 h-16 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: BN.surfaceUp }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                            className="px-2 py-0.5 rounded-md text-[10.5px] font-black leading-none"
                            style={{ background: BN.goldSoft, color: BN.gold }}
                        >
                            SLOT {b.slot}
                        </span>
                        {b.hidden && (
                            <span
                                className="px-2 py-0.5 rounded-md text-[10.5px] font-black leading-none flex items-center gap-1"
                                style={{ background: BN.errSoft, color: BN.err }}
                            >
                                <EyeOff className="w-3 h-3" /> YASHIRINGAN
                            </span>
                        )}
                        {!isExpired && !b.hidden && (
                            <span className="text-[11px] flex items-center gap-1" style={{ color: BN.text3 }}>
                                <Clock className="w-3 h-3" /> {daysLeft} kun qoldi
                            </span>
                        )}
                    </div>
                    <p className="text-[13.5px] font-bold line-clamp-2">{b.title}</p>
                    <a
                        href={b.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] flex items-center gap-1 mt-0.5 truncate"
                        style={{ color: BN.gold }}
                    >
                        <ExternalLink className="w-3 h-3" /> {b.ctaUrl}
                    </a>
                </div>
            </div>

            {/* Statistika */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat icon={<Eye className="w-3 h-3" />} label="Ko'rish" value={b.impressions.toLocaleString()} />
                <Stat icon={<MousePointerClick className="w-3 h-3" />} label="Bosish" value={b.clicks.toLocaleString()} />
                <Stat icon={<TrendingUp className="w-3 h-3" />} label="CTR" value={`${b.ctr.toFixed(2)}%`} />
            </div>

            {/* Owner + moliyaviy */}
            <div className="p-2.5 rounded-lg mb-3 text-[11.5px] flex items-center justify-between" style={{ background: BN.surfaceUp, color: BN.text2 }}>
                <span>
                    {b.owner?.username ? `@${b.owner.username}` : b.owner?.humoId ?? b.owner?.email ?? "Noma'lum"}
                    {b.shopSlug && <> · <span style={{ color: BN.gold }}>{b.shopSlug}</span></>}
                </span>
                <span className="font-black tabular-nums">
                    {b.paidAmountUzs.toLocaleString()} so&apos;m / {b.daysCount} kun
                </span>
            </div>

            {b.hidden && b.moderationNote && (
                <div
                    className="p-2.5 rounded-lg mb-3 text-[12px] flex items-start gap-2"
                    style={{ background: BN.errSoft, color: BN.err }}
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
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-black disabled:opacity-60"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Eye className="w-3.5 h-3.5" /> Qayta ochish</>}
                    </button>
                ) : (
                    <button
                        onClick={onHide}
                        disabled={busy || isExpired}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-black disabled:opacity-60"
                        style={{ background: BN.errSoft, color: BN.err }}
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
        <div className="p-2 rounded-lg" style={{ background: BN.surfaceUp }}>
            <p className="text-[10px] flex items-center gap-1 mb-0.5" style={{ color: BN.text3 }}>
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
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-3xl p-5"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-[15px] font-black mb-1">Reklamani yashirish</p>
                <p className="text-[12.5px] mb-4" style={{ color: BN.text3 }}>
                    Reklama darhol o&apos;chiriladi (5 slotdan biri bo&apos;shaydi). Sohib push oladi.
                </p>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 300))}
                    rows={3}
                    placeholder="Sabab (ixtiyoriy — sohib ko'radi)"
                    className="w-full p-3 rounded-xl text-[13px] resize-none focus:outline-none"
                    style={{
                        background: BN.surfaceUp,
                        color: BN.text,
                        border: `1px solid ${BN.border}`,
                    }}
                />
                <p className="text-[10.5px] mt-1 text-right tabular-nums" style={{ color: BN.text3 }}>
                    {note.length}/300
                </p>

                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl text-[13px] font-black"
                        style={{ background: BN.surfaceUp, color: BN.text }}
                    >
                        Ortga
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className="flex-1 h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5"
                        style={{ background: BN.err, color: "#fff" }}
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><EyeOff className="w-4 h-4" /> Yashirish</>}
                    </button>
                </div>
                <p className="text-[10.5px] mt-3 text-center" style={{ color: BN.text3 }}>
                    #{banner.id.slice(0, 8)} · {banner.title.slice(0, 40)}
                </p>
            </div>
        </div>
    );
}
