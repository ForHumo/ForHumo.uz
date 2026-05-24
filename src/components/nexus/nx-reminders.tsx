"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Bell, BellOff, Plus, Clock, Trash2, Radio, Music, Film } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type ReminderType = "live" | "premiere" | "podcast" | "event";

interface Reminder {
    id: string;
    type: ReminderType;
    title: string;
    creator: string;
    avatar: string;
    scheduledAt: string; // ISO-like display string
    minsLeft: number | null; // null = future, positive = minutes until, 0 = now
    notified: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_REMINDERS: Reminder[] = [
    {
        id: "rm1", type: "live", notified: false,
        title: "Jonli musiqa konsert — Toshkent Siti",
        creator: "Jasur Beats", avatar: "JB",
        scheduledAt: "Bugun, 20:00", minsLeft: 47,
    },
    {
        id: "rm2", type: "premiere", notified: false,
        title: "Tog' Qizi — yangi epizod premyerasi",
        creator: "Zilola Films", avatar: "ZF",
        scheduledAt: "Erta, 18:00", minsLeft: 1380,
    },
    {
        id: "rm3", type: "podcast", notified: true,
        title: "DevTalk UZ — Epizod 52",
        creator: "Bobur Karimov", avatar: "BK",
        scheduledAt: "Juma, 10:00", minsLeft: 4260,
    },
    {
        id: "rm4", type: "event", notified: false,
        title: "Nexus Music Awards 2026",
        creator: "Humo Events", avatar: "HE",
        scheduledAt: "12 Iyun, 19:00", minsLeft: 26880,
    },
];

const TYPE_META: Record<ReminderType, { icon: typeof Radio; label: string; color: string }> = {
    live:     { icon: Radio,  label: "Jonli efir", color: "#EF4444" },
    premiere: { icon: Film,   label: "Premyera",   color: "#8B5CF6" },
    podcast:  { icon: Music,  label: "Podkast",    color: "#3B82F6" },
    event:    { icon: Clock,  label: "Tadbir",     color: "#F59E0B" },
};

function fmtCountdown(mins: number | null): string {
    if (mins === null) return "";
    if (mins <= 0)     return "Hozir!";
    if (mins < 60)     return `${mins} daqiqada`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h < 24)        return m > 0 ? `${h}s ${m}d` : `${h} soatda`;
    const d = Math.floor(h / 24);
    return `${d} kunda`;
}

function countdownColor(mins: number | null): string {
    if (mins === null || mins > 1440) return "rgba(100,120,170,0.70)";
    if (mins <= 60)  return "#EF4444";
    if (mins <= 360) return "#F97316";
    return "#EAB308";
}

// ─────────────────────────────────────────────────────────────────────────────
// NxReminders
// ─────────────────────────────────────────────────────────────────────────────
export function NxReminders() {
    const { remindersOpen, setRemindersOpen } = useNxPlayer();

    const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
    const [addOpen,   setAddOpen]   = useState(false);
    const [newTitle,  setNewTitle]  = useState("");
    const [newType,   setNewType]   = useState<ReminderType>("live");

    if (!remindersOpen) return null;

    const deleteReminder = (id: string) =>
        setReminders(prev => prev.filter(r => r.id !== id));

    const toggleNotif = (id: string) =>
        setReminders(prev => prev.map(r => r.id === id ? { ...r, notified: !r.notified } : r));

    const addReminder = () => {
        if (!newTitle.trim()) return;
        const r: Reminder = {
            id: `rm_${Date.now()}`,
            type: newType,
            title: newTitle,
            creator: "Siz",
            avatar: "SZ",
            scheduledAt: "Belgilanmagan",
            minsLeft: null,
            notified: true,
        };
        setReminders(prev => [r, ...prev]);
        setNewTitle("");
        setAddOpen(false);
    };

    const sorted = [...reminders].sort((a, b) => {
        const am = a.minsLeft ?? Infinity;
        const bm = b.minsLeft ?? Infinity;
        return am - bm;
    });

    return (
        <div
            className="fixed inset-0 z-[120] flex flex-col"
            style={{ background: "#050818" }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}
            >
                <button
                    onClick={() => setRemindersOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                >
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Eslatmalar</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                        {reminders.length} ta eslatma
                    </p>
                </div>
                <button
                    onClick={() => setAddOpen(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                >
                    <Plus className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Reminder cards */}
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
                {sorted.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Bell className="w-12 h-12 mb-3" style={{ color: "rgba(43,62,232,0.30)" }} />
                        <p className="text-sm font-bold" style={{ color: "rgba(100,120,170,0.50)" }}>
                            Hali eslatmalar yo'q
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "rgba(80,100,150,0.50)" }}>
                            Jonli efirlar va premyeralarni kuzatib boring
                        </p>
                    </div>
                )}

                {sorted.map(r => {
                    const meta  = TYPE_META[r.type];
                    const Icon  = meta.icon;
                    const mins  = r.minsLeft;
                    const soon  = mins !== null && mins <= 60;
                    return (
                        <div
                            key={r.id}
                            className="p-4 rounded-2xl"
                            style={{
                                background: soon ? "rgba(239,68,68,0.07)" : "rgba(8,12,32,0.95)",
                                border: `1px solid ${soon ? "rgba(239,68,68,0.30)" : "rgba(43,62,232,0.15)"}`,
                            }}
                        >
                            {/* Top row */}
                            <div className="flex items-start gap-3">
                                {/* Type icon */}
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}44` }}
                                >
                                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Type + creator */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                            style={{ background: `${meta.color}22`, color: meta.color }}>
                                            {meta.label}
                                        </span>
                                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>
                                            {r.creator}
                                        </span>
                                    </div>
                                    <p className="text-[12px] font-bold text-white leading-snug mb-1 line-clamp-2">
                                        {r.title}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(100,120,170,0.50)" }} />
                                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>
                                            {r.scheduledAt}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col items-end gap-2 ml-2">
                                    <button onClick={() => toggleNotif(r.id)}>
                                        {r.notified
                                            ? <Bell    className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                            : <BellOff className="w-4 h-4" style={{ color: "rgba(100,120,170,0.40)" }} />
                                        }
                                    </button>
                                    <button onClick={() => deleteReminder(r.id)}>
                                        <Trash2 className="w-4 h-4" style={{ color: "rgba(239,68,68,0.50)" }} />
                                    </button>
                                </div>
                            </div>

                            {/* Countdown */}
                            {mins !== null && (
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(43,62,232,0.15)" }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                /* progress = how close we are: shorter time = higher % */
                                                width: `${Math.min(100, Math.max(5, 100 - (mins / 43200) * 100))}%`,
                                                background: soon
                                                    ? "linear-gradient(90deg,#EF4444,#F97316)"
                                                    : "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black flex-shrink-0" style={{ color: countdownColor(mins) }}>
                                        {fmtCountdown(mins)}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add reminder sheet */}
            {addOpen && (
                <div className="absolute inset-0 z-10 flex flex-col" style={{ background: "#050818" }}>
                    <div
                        className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}
                    >
                        <button
                            onClick={() => setAddOpen(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <p className="flex-1 text-sm font-black text-white">Yangi eslatma</p>
                        <button
                            onClick={addReminder}
                            disabled={!newTitle.trim()}
                            className="px-4 py-1.5 rounded-xl text-xs font-black text-white"
                            style={{
                                background: newTitle.trim() ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.15)",
                            }}
                        >
                            Qo'shish
                        </button>
                    </div>
                    <div className="flex-1 px-4 py-5 flex flex-col gap-4">
                        {/* Type picker */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Tur
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                                {(Object.keys(TYPE_META) as ReminderType[]).map(t => {
                                    const Icon2 = TYPE_META[t].icon;
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => setNewType(t)}
                                            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
                                            style={{
                                                background: newType === t ? `${TYPE_META[t].color}22` : "rgba(43,62,232,0.08)",
                                                border: `1px solid ${newType === t ? `${TYPE_META[t].color}55` : "rgba(43,62,232,0.15)"}`,
                                            }}
                                        >
                                            <Icon2 className="w-4 h-4" style={{ color: newType === t ? TYPE_META[t].color : "rgba(120,140,190,0.60)" }} />
                                            <span className="text-[9px] font-bold"
                                                style={{ color: newType === t ? "white" : "rgba(100,120,170,0.60)" }}>
                                                {TYPE_META[t].label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <input
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="Eslatma sarlavhasi..."
                            className="w-full bg-transparent text-sm font-bold text-white outline-none px-3 py-3 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}
                        />
                        <input
                            placeholder="Sana va vaqt (masalan: Bugun, 20:00)..."
                            className="w-full bg-transparent text-sm text-white outline-none px-3 py-3 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
