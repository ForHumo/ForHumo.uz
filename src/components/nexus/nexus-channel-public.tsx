"use client";

// Ommaviy kanal sahifasi — /nexus/ch/[handle]
// Telegram t.me/handle uslubidagi preview: kanal ma'lumoti + so'nggi 10 post + join tugmasi.
// Anonim foydalanuvchiga signIn CTA, a'zoga "Kanalga o'tish" tugmasi.

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Link } from "@/i18n/routing";
import {
    Loader2, Megaphone, Users, BadgeCheck, ArrowLeft, Copy, Check,
    Eye, ImageIcon, Video, Mic, MapPin, User, BarChart2, Lock, Shield, ExternalLink,
} from "lucide-react";
import { NxMarkdown } from "./nx-markdown";

type ChannelData = {
    channel: {
        id: string; handle: string; name: string;
        type: "CHANNEL" | "GROUP";
        description: string | null; avatarUrl: string | null; coverUrl: string | null;
        isPrivate: boolean; memberCount: number; rules: string | null; isSystem: boolean;
        createdAt: string;
    };
    owner: { id: string; name: string | null; username: string | null; image: string | null; humoId: string | null } | null;
    isMember: boolean;
    myRole: string | null;
    recent: Array<{
        id: string;
        preview: string | null;
        hasMedia: boolean;
        mediaType: string | null;
        firstMedia: string | null;
        mediaCount: number;
        isPoll: boolean;
        viewCount: number;
        createdAt: string;
    }>;
};

const FOUNDER_USERNAMES = new Set(["abduvoris", "aaa"]);

function timeAgo(iso: string): string {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const s = Math.floor((now - d) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daqiqa`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} kun`;
    return new Date(iso).toLocaleDateString("uz-UZ");
}

function formatCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 10000) return `${(n / 1000).toFixed(1)}K`;
    if (n < 1_000_000) return `${Math.floor(n / 1000)}K`;
    return `${(n / 1_000_000).toFixed(1)}M`;
}

function MediaIcon({ type }: { type: string | null }) {
    if (type === "video" || type === "video-circle") return <Video className="w-3 h-3" />;
    if (type === "audio") return <Mic className="w-3 h-3" />;
    if (type === "location") return <MapPin className="w-3 h-3" />;
    if (type === "contact") return <User className="w-3 h-3" />;
    return <ImageIcon className="w-3 h-3" />;
}

export function NexusChannelPublic({ handle }: { handle: string }) {
    const { status } = useSession();
    const [data, setData] = useState<ChannelData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showRules, setShowRules] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/nexus/channels/by-handle/${encodeURIComponent(handle)}`, { cache: "no-store" })
            .then(async r => {
                if (r.ok) setData(await r.json());
                else {
                    const d = await r.json().catch(() => ({}));
                    setError(d?.error === "not_found" ? "Kanal topilmadi" : "Yuklanmadi");
                }
            })
            .catch(() => setError("Yuklanmadi"))
            .finally(() => setLoading(false));
    }, [handle]);

    async function handleJoin() {
        if (!data) return;
        if (status !== "authenticated") {
            signIn("google", { callbackUrl: window.location.href });
            return;
        }
        setJoining(true);
        try {
            const res = await fetch(`/api/nexus/channels/${data.channel.id}/join`, { method: "POST" });
            if (res.ok) {
                window.location.href = `/nexus?channel=${encodeURIComponent(handle)}`;
            } else {
                const d = await res.json().catch(() => ({}));
                alert(d?.error ?? "Qo'shilib bo'lmadi");
            }
        } finally {
            setJoining(false);
        }
    }

    function copyLink() {
        try {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "#050818" }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#00CEC8" }} />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: "#050818" }}>
                <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}>
                        <Megaphone className="w-8 h-8" style={{ color: "#EF4444" }} />
                    </div>
                    <p className="text-lg font-bold text-white mb-2">{error ?? "Kanal topilmadi"}</p>
                    <p className="text-sm mb-6" style={{ color: "rgba(160,176,224,0.7)" }}>
                        Havola noto'g'ri yoki kanal o'chirilgan bo'lishi mumkin.
                    </p>
                    <Link href="/nexus" className="inline-block px-6 py-2.5 rounded-full text-sm font-black"
                        style={{ background: "#2B3EE8", color: "white" }}>
                        Nexus'ga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    const { channel, owner, isMember, recent } = data;
    const isFounder = owner?.username && FOUNDER_USERNAMES.has(owner.username.toLowerCase());
    const isVerified = isFounder || channel.isSystem;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: "#050818" }}>
            <div className="max-w-2xl mx-auto pb-16">
                {/* Back link */}
                <div className="px-4 pt-6 pb-2">
                    <Link href="/nexus" className="inline-flex items-center gap-2 text-sm font-bold"
                        style={{ color: "rgba(160,176,224,0.85)" }}>
                        <ArrowLeft className="w-4 h-4" /> Nexus
                    </Link>
                </div>

                {/* Cover */}
                <div className="relative mx-4 mt-3 rounded-3xl overflow-hidden"
                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.20)" }}>
                    <div className="relative w-full h-40 md:h-56"
                        style={channel.coverUrl
                            ? { backgroundImage: `url(${channel.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : { background: "linear-gradient(135deg, #2B3EE8 0%, #00CEC8 100%)" }}>
                        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,8,24,0) 0%, rgba(5,8,24,0.85) 100%)" }} />
                    </div>

                    {/* Header info */}
                    <div className="relative px-5 pb-5 -mt-12">
                        <div className="flex items-end gap-4">
                            <img src={channel.avatarUrl || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(channel.name)}`}
                                alt="" className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
                                style={{ background: "white", border: "3px solid #050818" }} />
                            <div className="flex-1 min-w-0 pb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-white truncate">{channel.name}</h1>
                                    {isVerified && <BadgeCheck className="w-6 h-6 flex-shrink-0" style={{ color: "#00CEC8" }} fill="#00CEC8" stroke="#050818" />}
                                    {channel.isPrivate && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                                            style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.30)" }}>
                                            <Lock className="w-3 h-3" /> Yopiq
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm mt-0.5" style={{ color: "rgba(160,176,224,0.85)" }}>
                                    @{channel.handle}
                                </p>
                            </div>
                        </div>

                        {/* Statistika */}
                        <div className="mt-4 flex items-center gap-4 text-sm">
                            <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: "rgba(200,214,247,0.9)" }}>
                                {channel.type === "CHANNEL"
                                    ? <Megaphone className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                    : <Users className="w-4 h-4" style={{ color: "#00CEC8" }} />}
                                {formatCount(channel.memberCount)} {channel.type === "CHANNEL" ? "obunachi" : "a'zo"}
                            </span>
                            <span className="text-xs" style={{ color: "rgba(140,160,210,0.7)" }}>
                                {new Date(channel.createdAt).toLocaleDateString("uz-UZ")} dan
                            </span>
                        </div>

                        {/* Description */}
                        {channel.description && (
                            <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(220,230,250,0.92)" }}>
                                    {channel.description}
                                </p>
                            </div>
                        )}

                        {/* Owner */}
                        {owner && (
                            <div className="mt-4 flex items-center gap-2 text-xs">
                                <span style={{ color: "rgba(140,160,210,0.7)" }}>Ega:</span>
                                <Link href={`/nexus/u/${owner.username}`} className="inline-flex items-center gap-1.5 font-bold hover:underline"
                                    style={{ color: "#00CEC8" }}>
                                    <img src={owner.image || "/logos/forhumo.png"} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    @{owner.username}
                                </Link>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-5 flex items-center gap-2">
                            {isMember ? (
                                <Link href={`/nexus?channel=${encodeURIComponent(handle)}`}
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full font-black text-sm"
                                    style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                    Kanalga o'tish <ExternalLink className="w-4 h-4" />
                                </Link>
                            ) : (
                                <button onClick={handleJoin} disabled={joining || channel.isPrivate}
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-full font-black text-sm disabled:opacity-50"
                                    style={{ background: channel.isPrivate ? "rgba(43,62,232,0.20)" : "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                    {joining ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : channel.isPrivate ? <><Lock className="w-4 h-4" /> Yopiq — taklif kerak</>
                                        : status !== "authenticated" ? "Google bilan qo'shilish"
                                        : channel.type === "CHANNEL" ? "Obuna bo'lish" : "Guruhga qo'shilish"}
                                </button>
                            )}
                            <button onClick={copyLink}
                                className="w-11 h-11 rounded-full inline-flex items-center justify-center"
                                style={{ background: "rgba(43,62,232,0.20)", color: "white" }}
                                title="Havolani nusxa olish">
                                {copied ? <Check className="w-4 h-4" style={{ color: "#00CEC8" }} /> : <Copy className="w-4 h-4" />}
                            </button>
                            {channel.rules && (
                                <button onClick={() => setShowRules(true)}
                                    className="w-11 h-11 rounded-full inline-flex items-center justify-center"
                                    style={{ background: "rgba(43,62,232,0.20)", color: "white" }}
                                    title="Qoidalar">
                                    <Shield className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent posts */}
                <div className="mt-6 px-4">
                    <h2 className="text-xs font-black uppercase tracking-widest mb-3 px-1"
                        style={{ color: "rgba(160,176,224,0.7)" }}>
                        So'nggi xabarlar
                    </h2>
                    {recent.length === 0 ? (
                        <div className="p-8 rounded-2xl text-center"
                            style={{ background: "rgba(11,18,40,0.60)", border: "1px dashed rgba(43,62,232,0.20)" }}>
                            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: "#00CEC8" }} />
                            <p className="text-sm" style={{ color: "rgba(160,176,224,0.7)" }}>
                                {channel.isPrivate ? "Yopiq kanal — postlar faqat a'zolarga ko'rinadi" : "Hali xabar yo'q"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recent.map(p => (
                                <Link key={p.id} href={`/nexus/ch/${encodeURIComponent(handle)}/msg/${encodeURIComponent(p.id)}`}
                                    className="block p-4 rounded-2xl transition"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                    <div className="flex items-start gap-3">
                                        {p.firstMedia && (p.mediaType === "image" || !p.mediaType) ? (
                                            <img src={p.firstMedia} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.10)" }} />
                                        ) : p.hasMedia ? (
                                            <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.14)", color: "#00CEC8" }}>
                                                <MediaIcon type={p.mediaType} />
                                            </div>
                                        ) : p.isPoll ? (
                                            <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgba(43,62,232,0.14)", color: "#00CEC8" }}>
                                                <BarChart2 className="w-5 h-5" />
                                            </div>
                                        ) : null}

                                        <div className="flex-1 min-w-0">
                                            {p.preview ? (
                                                <div className="text-sm text-white line-clamp-3">
                                                    <NxMarkdown text={p.preview} />
                                                </div>
                                            ) : p.isPoll ? (
                                                <p className="text-sm text-white font-bold">So'rovnoma</p>
                                            ) : p.hasMedia ? (
                                                <p className="text-sm text-white font-bold">
                                                    {p.mediaType === "video" ? "Video" : p.mediaType === "audio" ? "Ovoz" : p.mediaType === "location" ? "Joylashuv" : p.mediaType === "contact" ? "Kontakt" : "Rasm"}
                                                    {p.mediaCount > 1 && ` · ${p.mediaCount}`}
                                                </p>
                                            ) : (
                                                <p className="text-sm italic" style={{ color: "rgba(140,160,210,0.6)" }}>Bo'sh xabar</p>
                                            )}
                                            <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: "rgba(140,160,210,0.7)" }}>
                                                <span>{timeAgo(p.createdAt)}</span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Eye className="w-3 h-3" /> {formatCount(p.viewCount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Powered by Humo */}
                <div className="mt-8 text-center text-xs" style={{ color: "rgba(120,140,185,0.6)" }}>
                    <Link href="/nexus" className="hover:underline">
                        Humo Nexus · Ijtimoiy tarmoq
                    </Link>
                </div>
            </div>

            {/* Rules modal */}
            {showRules && channel.rules && (
                <>
                    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" onClick={() => setShowRules(false)} />
                    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-0 md:mx-auto md:max-w-lg z-[201] p-6 rounded-2xl max-h-[80vh] overflow-y-auto"
                        style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5" style={{ color: "#00CEC8" }} />
                            <h3 className="text-lg font-black text-white">Kanal qoidalari</h3>
                        </div>
                        <div className="text-sm whitespace-pre-wrap" style={{ color: "rgba(220,230,250,0.92)" }}>
                            <NxMarkdown text={channel.rules} />
                        </div>
                        <button onClick={() => setShowRules(false)}
                            className="mt-6 w-full h-11 rounded-full font-black text-sm"
                            style={{ background: "#2B3EE8", color: "white" }}>
                            Yopish
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
