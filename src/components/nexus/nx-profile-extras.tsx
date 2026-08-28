"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import QRCode from "qrcode";
import {
    Trophy, Award, Star, Sparkles, Users, UserCheck, PenLine, Video, Radio, ShoppingBag, Store,
    TrendingUp, AtSign, ShieldCheck, Wallet, Heart, MessageCircle, Play, Music2, Loader2, X, Copy, Check,
    Eye, Lock,
} from "lucide-react";

// Ikon xaritasi (achievements.ts'dagi string nomlarni Lucide component'ga)
const ICON_MAP: Record<string, React.ElementType> = {
    Trophy, Award, Star, Sparkles, Users, UserCheck, PenLine, Video, Radio,
    ShoppingBag, Store, TrendingUp, AtSign, ShieldCheck, Wallet, Heart,
};

const TIER_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
    bronze:   { fg: "#B08D57", bg: "rgba(176,141,87,0.10)",  border: "rgba(176,141,87,0.30)" },
    silver:   { fg: "#C0C0C0", bg: "rgba(192,192,192,0.10)", border: "rgba(192,192,192,0.30)" },
    gold:     { fg: "#F5B301", bg: "rgba(245,179,1,0.10)",   border: "rgba(245,179,1,0.35)" },
    platinum: { fg: "#00CEC8", bg: "rgba(0,206,200,0.10)",   border: "rgba(0,206,200,0.35)" },
};

interface Ach {
    code: string; title: string; description: string; icon: string;
    category: string; tier: string;
    earnedAt: string | null; isNew: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Achievements grid (kartochka)
// ─────────────────────────────────────────────────────────────────────────────
export function NxProfileAchievements() {
    const [items, setItems] = useState<Ach[]>([]);
    const [loading, setLoading] = useState(true);
    const [earnedCount, setEarnedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetch("/api/user/achievements")
            .then(r => r.json())
            .then(d => {
                setItems(d.items ?? []);
                setEarnedCount(d.earnedCount ?? 0);
                setTotalCount(d.totalCount ?? 0);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="mx-4 mt-3 rounded-2xl p-5 animate-pulse" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}>
                <div className="h-3.5 rounded w-32 mb-3" style={{ background: "rgba(43,62,232,0.15)" }} />
                <div className="grid grid-cols-4 gap-2">
                    {[0,1,2,3,4,5,6,7].map(i => (
                        <div key={i} className="aspect-square rounded-xl" style={{ background: "rgba(43,62,232,0.10)" }} />
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) return null;

    // Faqat olingan + top 4 olinmagan bronzalar (progress ko'rinishi)
    const earned = items.filter(i => i.earnedAt);
    const unearned = items.filter(i => !i.earnedAt).slice(0, 8 - Math.min(earned.length, 8));
    const shown = [...earned, ...unearned].slice(0, 12);

    return (
        <div className="mx-4 mt-3 rounded-2xl p-5" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}>
            <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4" style={{ color: "#F5B301" }} />
                <h3 className="text-sm font-black text-white flex-1">Yutuqlar</h3>
                <span className="text-xs font-black" style={{ color: "#F5B301" }}>{earnedCount}<span className="opacity-60">/{totalCount}</span></span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {shown.map(a => {
                    const Icon = ICON_MAP[a.icon] || Award;
                    const isEarned = !!a.earnedAt;
                    const tier = TIER_COLORS[a.tier] || TIER_COLORS.bronze;
                    return (
                        <div key={a.code} className="relative group flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                            style={{
                                background: isEarned ? tier.bg : "rgba(43,62,232,0.04)",
                                border: `1px solid ${isEarned ? tier.border : "rgba(43,62,232,0.10)"}`,
                                opacity: isEarned ? 1 : 0.55,
                            }}
                            title={`${a.title}: ${a.description}`}>
                            {a.isNew && (
                                <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded text-[7px] font-black text-white leading-none"
                                    style={{ background: "linear-gradient(135deg,#F5B301,#F97316)" }}>YANGI</span>
                            )}
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: isEarned ? tier.bg : "rgba(43,62,232,0.05)" }}>
                                {isEarned ? <Icon className="w-4 h-4" style={{ color: tier.fg }} />
                                          : <Lock className="w-3.5 h-3.5" style={{ color: "rgba(80,100,150,0.55)" }} />}
                            </div>
                            <span className="text-[8px] font-black text-center leading-tight line-clamp-2"
                                style={{ color: isEarned ? "#fff" : "rgba(140,160,210,0.65)" }}>{a.title}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent activity — o'zimning so'nggi 3 post + 3 video + 3 trek
// ─────────────────────────────────────────────────────────────────────────────
interface RPost { id: string; text: string | null; media: string[]; createdAt: string; likes: number; comments: number }
interface RVid { id: string; title: string; thumbUrl: string | null; durationSec: number; views: number; orientation: string }
interface RTrack { id: string; title: string; coverUrl: string | null; plays: number; durationSec: number }

function fmtN(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}
function fmtDur(s: number) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }

export function NxProfileActivity() {
    const [posts, setPosts] = useState<RPost[]>([]);
    const [videos, setVideos] = useState<RVid[]>([]);
    const [tracks, setTracks] = useState<RTrack[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/nexus/profile/activity")
            .then(r => r.json())
            .then(d => {
                setPosts(d.posts ?? []);
                setVideos(d.videos ?? []);
                setTracks(d.tracks ?? []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="mx-4 mt-3 rounded-2xl p-5 animate-pulse" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}>
                <div className="h-3.5 rounded w-40 mb-3" style={{ background: "rgba(43,62,232,0.15)" }} />
                <div className="flex flex-col gap-2">
                    {[0,1,2].map(i => (
                        <div key={i} className="h-14 rounded-xl" style={{ background: "rgba(43,62,232,0.08)" }} />
                    ))}
                </div>
            </div>
        );
    }

    if (posts.length === 0 && videos.length === 0 && tracks.length === 0) return null;

    return (
        <div className="mx-4 mt-3 rounded-2xl p-5" style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}>
            <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#00CEC8" }} />
                So&apos;nggi faoliyat
            </h3>

            {posts.length > 0 && (
                <div className="mb-3">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.60)" }}>Postlar</p>
                    <div className="flex flex-col gap-1.5">
                        {posts.map(p => (
                            <Link key={p.id} href={`/nexus/p/${p.id}`}
                                className="flex items-center gap-3 p-2 rounded-xl active:scale-[0.99] transition"
                                style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                {p.media[0] && (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(43,62,232,0.10)" }}>
                                        <img src={p.media[0]} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <p className="text-xs text-white line-clamp-1 flex-1" style={{ color: "rgba(200,215,245,0.85)" }}>
                                    {p.text || "(media post)"}
                                </p>
                                <div className="flex items-center gap-2 flex-shrink-0 text-[10px]" style={{ color: "rgba(120,140,185,0.75)" }}>
                                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" style={{ color: "#EF4444" }} />{p.likes}</span>
                                    <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" style={{ color: "#00CEC8" }} />{p.comments}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {videos.length > 0 && (
                <div className="mb-3">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.60)" }}>Videolar</p>
                    <div className="grid grid-cols-3 gap-2">
                        {videos.map(v => (
                            <Link key={v.id} href={`/nexus/v/${v.id}`} className="text-left group">
                                <div className="relative aspect-video rounded-lg overflow-hidden mb-1" style={{ border: "1px solid rgba(139,92,246,0.20)", background: "rgba(139,92,246,0.08)" }}>
                                    {v.thumbUrl
                                        ? <img src={v.thumbUrl} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4 text-white/40" /></div>}
                                    {v.durationSec > 0 && <span className="absolute bottom-1 right-1 px-1 rounded text-[8px] font-bold text-white" style={{ background: "rgba(5,8,24,0.85)" }}>{fmtDur(v.durationSec)}</span>}
                                </div>
                                <p className="text-[10px] font-bold text-white line-clamp-1">{v.title}</p>
                                <p className="text-[9px] flex items-center gap-0.5" style={{ color: "rgba(120,140,185,0.75)" }}>
                                    <Eye className="w-2.5 h-2.5" />{fmtN(v.views)}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {tracks.length > 0 && (
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(140,160,210,0.60)" }}>Musiqa</p>
                    <div className="flex flex-col gap-1.5">
                        {tracks.map(t => (
                            <Link key={t.id} href={`/nexus/t/${t.id}`}
                                className="flex items-center gap-3 p-2 rounded-xl active:scale-[0.99] transition"
                                style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.14)" }}>
                                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
                                    {t.coverUrl
                                        ? <img src={t.coverUrl} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-4 h-4" style={{ color: "rgba(16,185,129,0.5)" }} /></div>}
                                </div>
                                <p className="text-xs font-bold text-white flex-1 truncate">{t.title}</p>
                                <span className="text-[10px] flex items-center gap-0.5 flex-shrink-0" style={{ color: "#10B981" }}>
                                    <Play className="w-2.5 h-2.5 fill-current" />{fmtN(t.plays)}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR code modal — profil ulashish (username orqali)
// ─────────────────────────────────────────────────────────────────────────────
export function NxProfileQrModal({ username, open, onClose }: { username: string | null; open: boolean; onClose: () => void }) {
    const [dataUrl, setDataUrl] = useState<string>("");
    const [copied, setCopied] = useState(false);

    const url = username && typeof window !== "undefined"
        ? `${window.location.origin}/nexus/u/${username}`
        : "";

    useEffect(() => {
        if (!open || !url) return;
        QRCode.toDataURL(url, { width: 260, margin: 2, color: { dark: "#050818", light: "#ffffff" } })
            .then(setDataUrl)
            .catch(() => { });
    }, [open, url]);

    async function copyLink() {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* jim */ }
    }

    if (!open || !username) return null;

    return (
        <>
            <div className="fixed inset-0 z-[70]" style={{ background: "rgba(5,8,24,0.85)", backdropFilter: "blur(8px)" }} onClick={onClose} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[70] rounded-3xl overflow-hidden md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[380px]"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.25)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="text-base font-black text-white">Profil ulashish</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="px-6 pb-6 flex flex-col items-center">
                    {dataUrl ? (
                        <div className="p-3 rounded-2xl mb-4" style={{ background: "#fff" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={dataUrl} alt="QR" className="w-56 h-56" />
                        </div>
                    ) : (
                        <div className="w-56 h-56 flex items-center justify-center mb-4">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#00CEC8" }} />
                        </div>
                    )}
                    <p className="text-sm font-black text-white mb-1">@{username}</p>
                    <p className="text-[11px] text-center mb-4" style={{ color: "rgba(140,160,210,0.75)" }}>
                        QR kodni skaner qiling yoki havolani ulashing
                    </p>
                    <button onClick={copyLink}
                        className="w-full py-2.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 active:scale-95"
                        style={{ background: copied
                            ? "linear-gradient(135deg,#10B981,#0D9488)"
                            : "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {copied ? <><Check className="w-4 h-4" />Nusxa olindi</> : <><Copy className="w-4 h-4" />Havolani nusxalash</>}
                    </button>
                </div>
            </div>
        </>
    );
}
