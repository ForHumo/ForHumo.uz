"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Play, Users, Heart, Eye, BadgeCheck, Share2, MessageCircle, Edit3, BarChart2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxChannel — kreator kanal sahifasi (modal)
// ─────────────────────────────────────────────────────────────────────────────
export function NxChannel() {
    const { channelAuthor, closeChannel, openVideo, setMessagesOpen, setAnalyticsOpen, openShareSheet } = useNxPlayer();
    const { data: session } = useSession();
    const [subscribed, setSubscribed] = useState(false);

    if (!channelAuthor) return null;

    const myName   = session?.user?.name ?? "";
    const isOwn    = !!myName && channelAuthor.toLowerCase() === myName.toLowerCase();
    const seed     = channelAuthor.replace(/^@/, "");
    const avatar    = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
    const cover     = `https://picsum.photos/seed/cover${seed}/800/200`;

    /* Demo statistika */
    const stats = [
        { label: "Obunachi",  value: `${(seed.length * 4.7).toFixed(1)}K` },
        { label: "Ko'rish",   value: `${(seed.length * 85).toFixed(0)}K`  },
        { label: "Video",     value: `${seed.length * 3 + 5}`             },
        { label: "Like",      value: `${(seed.length * 12.3).toFixed(1)}K`},
    ];

    /* Demo videolar */
    const videos = Array.from({ length: 9 }, (_, i) => ({
        id:    `ch-${seed}-${i}`,
        title: [
            "Yangi loyiha prezentatsiyasi",
            "Texnologiya yangiliklari",
            "Qo'shiq — yangi albom",
            "Live — Jamoa bilan",
            "Dars — Asoslar",
            "Vlog — Kun tarixi",
            "Tutorial — Qo'llanma",
            "Review — Tahlil",
            "Short — Zavqli lahzalar",
        ][i],
        image:    `https://picsum.photos/seed/${seed}${i}/400/225`,
        views:    `${((i + 1) * 23)}K`,
        duration: `${6 + i * 2}:${String(i * 7 % 60).padStart(2, "0")}`,
    }));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={closeChannel}
            />

            {/* Modal */}
            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:max-h-[88vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "90vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Cover rasmI ─────────────────────────────────────── */}
                <div className="relative h-28 flex-shrink-0 overflow-hidden">
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(8,12,32,1) 0%, transparent 60%)" }} />
                    <button
                        onClick={closeChannel}
                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)", border: "1px solid rgba(43,62,232,0.25)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* ── Profil ──────────────────────────────────────────── */}
                <div className="px-5 pb-4 -mt-10 flex-shrink-0">
                    <div className="flex items-end gap-4 mb-4">
                        {/* Avatar */}
                        <div
                            className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0"
                            style={{
                                border: "3px solid rgba(8,12,32,1)",
                                boxShadow: "0 0 24px rgba(43,62,232,0.40)",
                                outline: "2px solid rgba(43,62,232,0.35)",
                            }}
                        >
                            <img src={avatar} alt={channelAuthor}
                                className="w-full h-full object-cover bg-white" />
                        </div>

                        {/* Tugmalar */}
                        <div className="flex gap-2 ml-auto">
                            {isOwn ? (
                                <>
                                    <button
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black text-white transition-all duration-150 active:scale-95"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 14px rgba(43,62,232,0.40)" }}
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Tahrirlash
                                    </button>
                                    <button
                                        onClick={() => { closeChannel(); setAnalyticsOpen(true); }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }}
                                        title="Analitika"
                                    >
                                        <BarChart2 className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setSubscribed(p => !p)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black text-white transition-all duration-150 active:scale-95"
                                        style={subscribed
                                            ? { background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.35)" }
                                            : { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 14px rgba(43,62,232,0.40)" }
                                        }
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        {subscribed ? "Obunada" : "Obuna"}
                                    </button>
                                    <button
                                        onClick={() => { closeChannel(); setMessagesOpen(true); }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }}
                                        title="Xabar yuborish"
                                    >
                                        <MessageCircle className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => openShareSheet(channelAuthor)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }}
                                title="Ulashish"
                            >
                                <Share2 className="w-4 h-4" style={{ color: "rgba(140,160,210,0.80)" }} />
                            </button>
                        </div>
                    </div>

                    {/* Ism */}
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-black text-white">{channelAuthor}</h2>
                        <BadgeCheck className="w-4 h-4" style={{ color: "#00CEC8" }} />
                    </div>
                    <p className="text-xs mb-4" style={{ color: "rgba(100,120,170,0.75)" }}>
                        Humo Nexus kreatori · Texnologiya va ijod
                    </p>

                    {/* Statistika */}
                    <div className="grid grid-cols-4 gap-2">
                        {stats.map(({ label, value }) => (
                            <div key={label} className="text-center py-2 rounded-xl"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                <p className="text-base font-black text-white leading-tight">{value}</p>
                                <p className="text-[9px] mt-0.5" style={{ color: "rgba(80,100,150,0.80)" }}>{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Videolar ────────────────────────────────────────── */}
                <div
                    className="flex-1 overflow-y-auto px-4 pb-6"
                    style={{ scrollbarWidth: "none", borderTop: "1px solid rgba(43,62,232,0.12)" }}
                >
                    <p className="text-[9px] font-black uppercase tracking-widest py-3"
                        style={{ color: "rgba(43,62,232,0.55)" }}>
                        Videolar
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {videos.map(v => (
                            <button
                                key={v.id}
                                onClick={() => openVideo({
                                    title: v.title, author: channelAuthor,
                                    avatar, image: v.image,
                                    views: v.views, duration: v.duration,
                                })}
                                className="group text-left"
                            >
                                <div className="relative aspect-video rounded-xl overflow-hidden mb-1.5"
                                    style={{ border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <img src={v.image} alt={v.title}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        style={{ background: "rgba(5,8,24,0.50)" }}>
                                        <Play className="w-6 h-6 text-white fill-white" />
                                    </div>
                                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
                                        style={{ background: "rgba(5,8,24,0.80)" }}>
                                        {v.duration}
                                    </span>
                                </div>
                                <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[#00CEC8] transition-colors">
                                    {v.title}
                                </p>
                                <p className="text-[9px] mt-0.5 flex items-center gap-0.5"
                                    style={{ color: "rgba(80,100,150,0.80)" }}>
                                    <Eye className="w-2.5 h-2.5" />{v.views}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
