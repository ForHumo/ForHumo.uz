"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Bell, Heart, MessageCircle, UserPlus, Reply,
    CheckCheck, Loader2, Flame, BadgeCheck, Music2, Coins, Radio, Gift, AtSign, BellRing, BellOff, Star, PhoneMissed,
    Settings2, Check,
} from "lucide-react";
import { NOTIF_TYPES, NOTIF_LABELS, type NotifTypeKey } from "@/lib/notif-types";
import { formatMoney, type Currency } from "@/lib/money";
import { getPushState, subscribePush, unsubscribePush, type PushState } from "@/lib/push-client";
import { RINGTONE_LABELS, RINGTONE_DESCRIPTIONS, previewRingtone, type RingtoneVariant } from "@/lib/nexus-ringtone";

type NType = "LIKE" | "COMMENT" | "FOLLOW" | "REPLY" | "VIDEO_LIKE" | "VIDEO_COMMENT" | "TRACK_LIKE" | "PURCHASE" | "LIVE" | "TIP" | "MENTION" | "SUB_EXPIRING" | "CALL_MISSED";
interface NActor { name: string | null; username: string | null; image: string | null; verified: boolean }
interface Notif {
    id: string; type: NType; read: boolean; createdAt: string; actor: NActor | null; postText: string | null;
    postId?: string | null; videoId?: string | null; trackId?: string | null; liveId?: string | null; callId?: string | null;
    amount?: number | null;
}

const TYPE_ICONS: Record<NType, React.ElementType> = {
    LIKE: Heart, COMMENT: MessageCircle, FOLLOW: UserPlus, REPLY: Reply,
    VIDEO_LIKE: Heart, VIDEO_COMMENT: MessageCircle, TRACK_LIKE: Music2, PURCHASE: Coins, LIVE: Radio, TIP: Gift, MENTION: AtSign, SUB_EXPIRING: Star, CALL_MISSED: PhoneMissed,
};
const TYPE_COLORS: Record<NType, string> = {
    LIKE: "#EF4444", COMMENT: "#2B3EE8", FOLLOW: "#10B981", REPLY: "#8B5CF6",
    VIDEO_LIKE: "#EF4444", VIDEO_COMMENT: "#8B5CF6", TRACK_LIKE: "#10B981", PURCHASE: "#00CEC8", LIVE: "#EF4444", TIP: "#F59E0B", MENTION: "#2B3EE8", SUB_EXPIRING: "#8B5CF6", CALL_MISSED: "#EF4444",
};
const TYPE_TEXT: Record<NType, string> = {
    LIKE: "postingizni yoqtirdi",
    COMMENT: "postingizga izoh qoldirdi",
    FOLLOW: "sizni kuzatdi",
    REPLY: "izohingizga javob berdi",
    VIDEO_LIKE: "videongizni yoqtirdi",
    VIDEO_COMMENT: "videongizga izoh qoldirdi",
    TRACK_LIKE: "trekingizni yoqtirdi",
    PURCHASE: "videongizni sotib oldi",
    LIVE: "jonli efir boshladi",
    TIP: "sizni qo'llab-quvvatladi",
    MENTION: "sizni eslatib o'tdi",
    SUB_EXPIRING: "ijodkoriga obunangiz tugayapti",
    CALL_MISSED: "sizni chaqirdi (javob berilmadi)",
};

// Bildirishnoma qaysi kontentga olib boradi
function notifHref(n: Notif): string | null {
    if (n.videoId) return `/nexus/v/${n.videoId}`;
    if (n.trackId) return `/nexus/t/${n.trackId}`;
    if (n.liveId) return `/nexus/live/${n.liveId}`;
    if (n.postId) return `/nexus/p/${n.postId}`;
    if (n.actor?.username) return `/nexus/u/${n.actor.username}`;
    return null;
}

function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "Hozir";
    if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}
function avatarOf(a: NActor | null) {
    return a?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(a?.username || a?.name || "user")}`;
}

const FILTERS: { id: "all" | NType; label: string; icon: React.ElementType }[] = [
    { id: "all", label: "Barchasi", icon: Flame },
    { id: "LIKE", label: "Like", icon: Heart },
    { id: "COMMENT", label: "Izohlar", icon: MessageCircle },
    { id: "FOLLOW", label: "Follow", icon: UserPlus },
];

export function NxNotifications() {
    const { notifOpen, setNotifOpen } = useNxPlayer();
    const [filter, setFilter] = useState<"all" | NType>("all");
    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [currency, setCurrency] = useState<Currency>("UZS");
    const [loading, setLoading] = useState(true);
    const [pushState, setPushState] = useState<PushState>("unsupported");
    const [pushBusy, setPushBusy] = useState(false);
    const [prefsOpen, setPrefsOpen] = useState(false);
    const [prefs, setPrefs] = useState<Record<string, boolean>>({});
    const [ringtone, setRingtone] = useState<RingtoneVariant>("signature");

    async function loadPrefs() {
        try {
            const d = await fetch("/api/user/notif-prefs").then(r => r.json());
            setPrefs(d.prefs ?? {});
        } catch { /* ignore */ }
        try {
            const r = await fetch("/api/user/ringtone").then(x => x.json());
            if (r?.ringtone) setRingtone(r.ringtone as RingtoneVariant);
        } catch { /* ignore */ }
    }
    async function changeRingtone(v: RingtoneVariant) {
        setRingtone(v);
        previewRingtone(v);   // darrov demo eshittirish
        await fetch("/api/user/ringtone", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variant: v }),
        }).catch(() => { });
    }
    async function togglePref(type: NotifTypeKey) {
        const currentlyEnabled = prefs[type] !== false; // default yoqilgan
        const nextEnabled = !currentlyEnabled;
        setPrefs(p => {
            const next = { ...p };
            if (nextEnabled) delete next[type]; else next[type] = false;
            return next;
        });
        await fetch("/api/user/notif-prefs", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, enabled: nextEnabled }),
        }).catch(() => { });
    }

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetch("/api/nexus/notifications").then(r => r.json());
            setNotifs(d.notifications ?? []);
            setCurrency(d.currency === "USD" ? "USD" : "UZS");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (notifOpen) { load(); getPushState().then(setPushState); loadPrefs(); } }, [notifOpen, load]);

    async function togglePush() {
        if (pushBusy) return;
        setPushBusy(true);
        try {
            setPushState(pushState === "subscribed" ? await unsubscribePush() : await subscribePush());
        } finally { setPushBusy(false); }
    }

    if (!notifOpen) return null;

    const unreadCount = notifs.filter(n => !n.read).length;
    const filtered = filter === "all"
        ? notifs
        : filter === "COMMENT"
            ? notifs.filter(n => ["COMMENT", "REPLY", "VIDEO_COMMENT"].includes(n.type))
            : filter === "LIKE"
                ? notifs.filter(n => ["LIKE", "VIDEO_LIKE", "TRACK_LIKE"].includes(n.type))
                : notifs.filter(n => n.type === filter);

    async function markAllRead() {
        setNotifs(p => p.map(n => ({ ...n, read: true })));
        await fetch("/api/nexus/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => { });
    }
    function markOne(id: string) {
        setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
        fetch("/api/nexus/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => { });
    }
    const close = () => setNotifOpen(false);

    return (
        <>
            <div className="fixed inset-0 z-[60]" style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)" }} onClick={close} />

            <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-16 md:right-4 md:bottom-auto
                           md:w-[380px] md:max-h-[calc(100vh-80px)] md:rounded-2xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 24px 64px rgba(0,0,0,0.70)", maxHeight: "85vh" }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <Bell className="w-5 h-5 flex-shrink-0" style={{ color: "#2B3EE8" }} />
                    <div className="flex-1">
                        <h3 className="text-base font-black text-white">Bildirishnomalar</h3>
                        {unreadCount > 0 && <p className="text-[10px]" style={{ color: "rgba(0,206,200,0.80)" }}>{unreadCount} ta yangi</p>}
                    </div>
                    {pushState !== "unsupported" && pushState !== "denied" && (
                        <button onClick={togglePush} disabled={pushBusy} title={pushState === "subscribed" ? "Push yoqilgan" : "Push'ni yoqish"}
                            className="flex items-center justify-center w-8 h-8 rounded-lg"
                            style={pushState === "subscribed"
                                ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8" }
                                : { background: "rgba(43,62,232,0.12)", color: "rgba(140,160,210,0.85)" }}>
                            {pushBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pushState === "subscribed" ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                            style={{ background: "rgba(43,62,232,0.12)", color: "rgba(140,160,210,0.85)" }}>
                            <CheckCheck className="w-3 h-3" /> Hammasini o&apos;qi
                        </button>
                    )}
                    <button onClick={() => setPrefsOpen(o => !o)} title="Bildirishnoma sozlamalari"
                        className="w-8 h-8 flex items-center justify-center rounded-lg"
                        style={prefsOpen
                            ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8" }
                            : { background: "rgba(43,62,232,0.12)", color: "rgba(140,160,210,0.85)" }}>
                        <Settings2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Prefs panel (Settings2 tugmasi bilan ochiladi) */}
                {prefsOpen && (
                    <div className="px-5 py-3 flex-shrink-0 space-y-1.5 overflow-y-auto max-h-[60vh]" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)", background: "rgba(43,62,232,0.04)", scrollbarWidth: "none" }}>
                        <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: "rgba(140,160,210,0.75)" }}>Push bildirishnomalar</p>
                        {NOTIF_TYPES.map(t => {
                            const enabled = prefs[t] !== false;
                            return (
                                <button key={t} onClick={() => togglePref(t)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-all active:scale-[0.98]"
                                    style={{ background: enabled ? "rgba(0,206,200,0.08)" : "rgba(43,62,232,0.05)" }}>
                                    <span className="text-[11px] font-bold text-white flex-1 truncate">{NOTIF_LABELS[t]}</span>
                                    <div className="w-9 h-5 rounded-full relative flex-shrink-0 transition-colors"
                                        style={{ background: enabled ? "#00CEC8" : "rgba(80,100,150,0.4)" }}>
                                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                                            style={{ left: enabled ? "18px" : "2px" }} />
                                    </div>
                                </button>
                            );
                        })}

                        {/* Ringtone selektori */}
                        <p className="text-[10px] font-black uppercase tracking-wider mt-4 mb-2" style={{ color: "rgba(140,160,210,0.75)" }}>Chaqiruv ohangi</p>
                        <p className="text-[10px] mb-2" style={{ color: "rgba(120,140,185,0.65)" }}>Tanlash uchun bosing — darrov namuna eshittiradi</p>
                        {(Object.keys(RINGTONE_LABELS) as RingtoneVariant[]).map(v => {
                            const active = ringtone === v;
                            return (
                                <button key={v} onClick={() => changeRingtone(v)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all active:scale-[0.98]"
                                    style={{ background: active ? "rgba(0,206,200,0.12)" : "rgba(43,62,232,0.05)", border: active ? "1px solid rgba(0,206,200,0.30)" : "1px solid transparent" }}>
                                    <div className="w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center"
                                        style={{ background: active ? "#00CEC8" : "rgba(80,100,150,0.20)" }}>
                                        {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-white leading-tight">{RINGTONE_LABELS[v]}</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(120,140,185,0.75)" }}>{RINGTONE_DESCRIPTIONS[v]}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Filtr */}
                <div className="flex gap-2 px-4 py-2.5 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none", borderBottom: "1px solid rgba(43,62,232,0.10)" }}>
                    {FILTERS.map(f => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold flex-shrink-0 transition-all duration-150"
                            style={filter === f.id
                                ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff" }
                                : { background: "rgba(43,62,232,0.08)", color: "rgba(140,160,210,0.80)", border: "1px solid rgba(43,62,232,0.16)" }}>
                            <f.icon className="w-3 h-3" />{f.label}
                        </button>
                    ))}
                </div>

                {/* Ro'yxat */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Bell className="w-12 h-12 mb-3" style={{ color: "rgba(43,62,232,0.25)" }} />
                            <p className="text-sm font-bold text-white/40">Bildirishnoma yo&apos;q</p>
                        </div>
                    ) : filtered.map(n => {
                        const Icon = TYPE_ICONS[n.type];
                        const inner = (
                            <>
                                <div className="relative flex-shrink-0">
                                    <div className="w-10 h-10 rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(43,62,232,0.22)" }}>
                                        <img src={avatarOf(n.actor)} alt="" className="w-full h-full object-cover bg-white" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: TYPE_COLORS[n.type] }}>
                                        <Icon className="w-2.5 h-2.5 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-white leading-snug">
                                        <span className="font-bold inline-flex items-center gap-0.5">
                                            {n.actor?.name || n.actor?.username || "Kimdir"}
                                            {n.actor?.verified && <BadgeCheck className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                        </span>{" "}
                                        <span style={{ color: "rgba(180,200,240,0.85)" }}>{TYPE_TEXT[n.type]}</span>
                                        {n.type === "TIP" && n.amount ? <span className="font-black ml-1" style={{ color: "#F59E0B" }}>{formatMoney(n.amount, currency)}</span> : null}
                                    </p>
                                    {n.postText && <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(120,140,185,0.7)" }}>&ldquo;{n.postText}&rdquo;</p>}
                                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.75)" }}>{timeAgo(n.createdAt)}</p>
                                </div>
                                {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }} />}
                            </>
                        );
                        const cls = "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-150";
                        const st = { background: n.read ? "transparent" : "rgba(43,62,232,0.06)", borderBottom: "1px solid rgba(43,62,232,0.07)" };
                        const href = notifHref(n);
                        return href ? (
                            <Link key={n.id} href={href} onClick={() => { markOne(n.id); close(); }} className={cls} style={st}>{inner}</Link>
                        ) : (
                            <button key={n.id} onClick={() => markOne(n.id)} className={cls} style={st}>{inner}</button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
