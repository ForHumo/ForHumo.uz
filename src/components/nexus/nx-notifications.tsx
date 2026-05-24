"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Bell, Heart, MessageCircle, UserPlus,
    Radio, Zap, CheckCheck, Settings, Flame,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type NType = "like" | "comment" | "subscribe" | "live" | "system";

interface Notif {
    id: number; type: NType;
    user: string; content: string; time: string; unread: boolean;
}

const NOTIFS: Notif[] = [
    { id: 1,  type: "like",      user: "Sardor",       content: "sizning videongizni yoqtirdi",            time: "2 daqiqa",  unread: true  },
    { id: 2,  type: "comment",   user: "Madina",        content: "izoh qoldirdi: \"Ajoyib video!\"",        time: "5 daqiqa",  unread: true  },
    { id: 3,  type: "subscribe", user: "Dilnoza",       content: "kanalingizga obuna bo'ldi",               time: "12 daqiqa", unread: true  },
    { id: 4,  type: "live",      user: "Humo Official", content: "jonli efirni boshladi",                   time: "18 daqiqa", unread: true  },
    { id: 5,  type: "like",      user: "Islom",         content: "musiqangizni yoqtirdi",                   time: "30 daqiqa", unread: true  },
    { id: 6,  type: "comment",   user: "Kamola",        content: "izoh qoldirdi: \"Davom eting!\"",         time: "1 soat",    unread: false },
    { id: 7,  type: "subscribe", user: "Bobur",         content: "kanalingizga obuna bo'ldi",               time: "2 soat",    unread: false },
    { id: 8,  type: "system",    user: "Nexus",         content: "Video yuklanishi muvaffaqiyatli yakunlandi", time: "3 soat", unread: false },
    { id: 9,  type: "live",      user: "eSport UZ",     content: "Pro Gaming Finals efirini boshladi",      time: "5 soat",    unread: false },
    { id: 10, type: "like",      user: "Zulfiya",       content: "Shorts videongizni yoqtirdi",             time: "6 soat",    unread: false },
    { id: 11, type: "comment",   user: "Jasur",         content: "izoh qoldirdi: \"Zo'r davom eting\"",     time: "8 soat",    unread: false },
    { id: 12, type: "system",    user: "Nexus Pro",     content: "Pro obunangiz muvaffaqiyatli yangilandi", time: "1 kun",     unread: false },
    { id: 13, type: "subscribe", user: "Anvar",         content: "kanalingizga obuna bo'ldi",               time: "1 kun",     unread: false },
    { id: 14, type: "like",      user: "Gulnora",       content: "Podcast epizodingizni yoqtirdi",          time: "2 kun",     unread: false },
    { id: 15, type: "comment",   user: "Sherzod",       content: "izoh qoldirdi: \"Rahmat!\"",              time: "2 kun",     unread: false },
];

const TYPE_ICONS: Record<NType, React.ElementType> = {
    like:      Heart,
    comment:   MessageCircle,
    subscribe: UserPlus,
    live:      Radio,
    system:    Zap,
};
const TYPE_COLORS: Record<NType, string> = {
    like:      "#EF4444",
    comment:   "#2B3EE8",
    subscribe: "#10B981",
    live:      "#F97316",
    system:    "#00CEC8",
};

// ─────────────────────────────────────────────────────────────────────────────
// NxNotifications
// ─────────────────────────────────────────────────────────────────────────────
export function NxNotifications() {
    const { notifOpen, setNotifOpen } = useNxPlayer();
    const [filter, setFilter] = useState<"all" | NType>("all");
    const [notifs, setNotifs] = useState(NOTIFS);

    if (!notifOpen) return null;

    const unreadCount = notifs.filter(n => n.unread).length;
    const filtered    = filter === "all" ? notifs : notifs.filter(n => n.type === filter);
    const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, unread: false })));

    const FILTERS: { id: "all" | NType; label: string; icon: React.ElementType }[] = [
        { id: "all",       label: "Barchasi", icon: Flame         },
        { id: "like",      label: "Like",     icon: Heart         },
        { id: "comment",   label: "Izohlar",  icon: MessageCircle },
        { id: "subscribe", label: "Obunalar", icon: UserPlus      },
        { id: "live",      label: "Efirlar",  icon: Radio         },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[60]"
                style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)" }}
                onClick={() => setNotifOpen(false)}
            />

            {/* Panel */}
            <div
                className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-16 md:right-4 md:bottom-auto
                           md:w-[380px] md:max-h-[calc(100vh-80px)] md:rounded-2xl"
                style={{
                    background:  "rgba(8,12,32,0.98)",
                    border:      "1px solid rgba(43,62,232,0.22)",
                    boxShadow:   "0 24px 64px rgba(0,0,0,0.70)",
                    maxHeight:   "85vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <Bell className="w-5 h-5 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                    <div className="flex-1">
                        <h3 className="text-base font-black text-white">Bildirishnomalar</h3>
                        {unreadCount > 0 && (
                            <p className="text-[10px]" style={{ color: "rgba(0,206,200,0.80)" }}>
                                {unreadCount} ta yangi
                            </p>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                            style={{ background: "rgba(43,62,232,0.12)", color: "rgba(140,160,210,0.85)" }}
                        >
                            <CheckCheck className="w-3 h-3" />
                            Hammasini o'qi
                        </button>
                    )}
                    <button
                        onClick={() => setNotifOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Filtr chips */}
                <div
                    className="flex gap-2 px-4 py-2.5 overflow-x-auto flex-shrink-0"
                    style={{ scrollbarWidth: "none", borderBottom: "1px solid rgba(43,62,232,0.10)" }}
                >
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold flex-shrink-0 transition-all duration-150"
                            style={filter === f.id ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff",
                            } : {
                                background: "rgba(43,62,232,0.08)", color: "rgba(140,160,210,0.80)",
                                border: "1px solid rgba(43,62,232,0.16)",
                            }}
                        >
                            <f.icon className="w-3 h-3" />{f.label}
                        </button>
                    ))}
                </div>

                {/* Ro'yxat */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Bell className="w-12 h-12 mb-3" style={{ color: "rgba(43,62,232,0.25)" }} />
                            <p className="text-sm font-bold text-white/40">Bildirishnoma yo'q</p>
                        </div>
                    ) : filtered.map(n => {
                        const Icon = TYPE_ICONS[n.type];
                        return (
                            <button
                                key={n.id}
                                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-150"
                                style={{
                                    background:   n.unread ? "rgba(43,62,232,0.06)" : "transparent",
                                    borderBottom: "1px solid rgba(43,62,232,0.07)",
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.unread ? "rgba(43,62,232,0.06)" : "transparent"}
                            >
                                {/* Avatar + type icon */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-10 h-10 rounded-2xl overflow-hidden"
                                        style={{ border: "2px solid rgba(43,62,232,0.22)" }}>
                                        <img
                                            src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${n.user}`}
                                            alt={n.user}
                                            className="w-full h-full object-cover bg-white"
                                        />
                                    </div>
                                    <div
                                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ background: TYPE_COLORS[n.type] }}
                                    >
                                        <Icon className="w-2.5 h-2.5 text-white" />
                                    </div>
                                </div>

                                {/* Kontent */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-white leading-snug">
                                        <span className="font-bold">{n.user}</span>{" "}
                                        <span style={{ color: "rgba(180,200,240,0.85)" }}>{n.content}</span>
                                    </p>
                                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.75)" }}>
                                        {n.time} avval
                                    </p>
                                </div>

                                {n.unread && (
                                    <div
                                        className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                    <button
                        className="w-full flex items-center gap-2 text-[11px] justify-center"
                        style={{ color: "rgba(80,100,150,0.75)" }}
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Bildirishnoma sozlamalari
                    </button>
                </div>
            </div>
        </>
    );
}
