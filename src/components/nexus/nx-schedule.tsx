"use client";

import { useState } from "react";
import { X, Calendar, Clock, Plus, ChevronLeft, ChevronRight, Radio, Film, Music2, Mic2, FileText, Check, Trash2 } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ContentType = "live" | "video" | "music" | "podcast" | "post";

interface ScheduledItem {
    id: string;
    title: string;
    type: ContentType;
    date: string;   // YYYY-MM-DD
    time: string;   // HH:MM
    note: string;
    published: boolean;
}

const TYPE_ICONS: Record<ContentType, React.ElementType> = {
    live: Radio, video: Film, music: Music2, podcast: Mic2, post: FileText,
};
const TYPE_LABELS: Record<ContentType, string> = {
    live: "Jonli efir", video: "Video", music: "Musiqa", podcast: "Podkast", post: "Post",
};
const TYPE_COLORS: Record<ContentType, string> = {
    live: "#EF4444", video: "#2B3EE8", music: "#10B981", podcast: "#8B5CF6", post: "#F59E0B",
};

const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const DAYS   = ["Du","Se","Ch","Pa","Ju","Sh","Ya"];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number): number {
    return (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
}
function toYMD(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const INITIAL_ITEMS: ScheduledItem[] = [
    { id: "s1", title: "Haftalik musiqa stream",   type: "live",    date: "2025-05-26", time: "19:00", note: "Yangi albom qo'shiqlari", published: false },
    { id: "s2", title: "Yangi video dars",          type: "video",   date: "2025-05-28", time: "14:00", note: "React hooks haqida",       published: false },
    { id: "s3", title: "Podkast #12 — Startaplar",  type: "podcast", date: "2025-05-30", time: "10:00", note: "Mehmon: Jasur Umarov",      published: false },
    { id: "s4", title: "Yangi singl — Bahor",        type: "music",   date: "2025-06-02", time: "12:00", note: "Barcha platformalarda",    published: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxSchedule
// ─────────────────────────────────────────────────────────────────────────────
export function NxSchedule() {
    const { scheduleOpen, setScheduleOpen } = useNxPlayer();
    const today = new Date();
    const [year,  setYear]  = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(toYMD(today.getFullYear(), today.getMonth(), today.getDate()));
    const [items, setItems] = useState<ScheduledItem[]>(INITIAL_ITEMS);
    const [creating, setCreating] = useState(false);
    const [draft, setDraft] = useState({ title: "", type: "live" as ContentType, time: "18:00", note: "" });

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay    = getFirstDayOfMonth(year, month);

    const dayItems = items.filter(i => i.date === selectedDate);
    const monthItemDates = new Set(items.map(i => i.date));

    const prevMonth = () => {
        if (month === 0) { setYear(y => y - 1); setMonth(11); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setYear(y => y + 1); setMonth(0); }
        else setMonth(m => m + 1);
    };

    const saveItem = () => {
        if (!draft.title.trim()) return;
        const newItem: ScheduledItem = {
            id: `s${Date.now()}`,
            title: draft.title,
            type: draft.type,
            date: selectedDate,
            time: draft.time,
            note: draft.note,
            published: false,
        };
        setItems(prev => [...prev, newItem]);
        setDraft({ title: "", type: "live", time: "18:00", note: "" });
        setCreating(false);
    };

    const deleteItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
    const togglePublished = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, published: !i.published } : i));

    if (!scheduleOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setScheduleOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[92vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "94vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                            <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Kontent jadvali</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                {items.length} ta rejalashtirilgan
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setScheduleOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {/* Calendar */}
                    <div className="px-5 pb-4">
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-3">
                            <button onClick={prevMonth}
                                className="w-7 h-7 flex items-center justify-center rounded-lg"
                                style={{ background: "rgba(43,62,232,0.12)" }}>
                                <ChevronLeft className="w-4 h-4" style={{ color: "rgba(140,160,210,0.80)" }} />
                            </button>
                            <p className="text-sm font-black text-white">{MONTHS[month]} {year}</p>
                            <button onClick={nextMonth}
                                className="w-7 h-7 flex items-center justify-center rounded-lg"
                                style={{ background: "rgba(43,62,232,0.12)" }}>
                                <ChevronRight className="w-4 h-4" style={{ color: "rgba(140,160,210,0.80)" }} />
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {DAYS.map(d => (
                                <div key={d} className="text-center text-[9px] font-bold py-1"
                                    style={{ color: "rgba(80,100,150,0.60)" }}>{d}</div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-y-1">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const ymd = toYMD(year, month, day);
                                const isSelected = ymd === selectedDate;
                                const isToday = ymd === toYMD(today.getFullYear(), today.getMonth(), today.getDate());
                                const hasItems = monthItemDates.has(ymd);
                                return (
                                    <button key={day} onClick={() => setSelectedDate(ymd)}
                                        className="flex flex-col items-center py-1 rounded-lg transition-all duration-150"
                                        style={{
                                            background: isSelected ? "linear-gradient(135deg,#2B3EE8,#8B5CF6)" : "transparent",
                                        }}>
                                        <span className="text-xs font-bold"
                                            style={{ color: isSelected ? "white" : isToday ? "#2B3EE8" : "rgba(180,200,240,0.85)" }}>
                                            {day}
                                        </span>
                                        {hasItems && !isSelected && (
                                            <div className="w-1 h-1 rounded-full mt-0.5"
                                                style={{ background: "#2B3EE8" }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected date items */}
                    <div className="px-5 pb-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-black text-white">
                                {selectedDate === toYMD(today.getFullYear(), today.getMonth(), today.getDate())
                                    ? "Bugun"
                                    : selectedDate}
                                {" "}— {dayItems.length} ta reja
                            </p>
                            <button onClick={() => setCreating(true)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black text-white"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                                <Plus className="w-3 h-3" /> Qo'shish
                            </button>
                        </div>

                        {/* Create form */}
                        {creating && (
                            <div className="mb-3 p-4 rounded-2xl"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(80,100,150,0.70)" }}>
                                    Yangi reja qo'shish — {selectedDate}
                                </p>
                                <input
                                    value={draft.title}
                                    onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                                    placeholder="Sarlavha..."
                                    className="w-full bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.50)] outline-none border-b mb-3 pb-1.5"
                                    style={{ borderColor: "rgba(43,62,232,0.30)" }}
                                />
                                {/* Type selector */}
                                <div className="flex gap-1.5 flex-wrap mb-3">
                                    {(Object.entries(TYPE_LABELS) as [ContentType, string][]).map(([key, label]) => {
                                        const TIcon = TYPE_ICONS[key];
                                        return (
                                            <button key={key}
                                                onClick={() => setDraft(d => ({ ...d, type: key }))}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                                style={draft.type === key ? {
                                                    background: TYPE_COLORS[key],
                                                    color: "white",
                                                } : {
                                                    background: "rgba(43,62,232,0.10)",
                                                    border: "1px solid rgba(43,62,232,0.20)",
                                                    color: "rgba(140,160,210,0.70)",
                                                }}>
                                                <TIcon className="w-2.5 h-2.5" /> {label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg flex-1"
                                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                        <Clock className="w-3 h-3" style={{ color: "rgba(43,62,232,0.70)" }} />
                                        <input
                                            type="time"
                                            value={draft.time}
                                            onChange={e => setDraft(d => ({ ...d, time: e.target.value }))}
                                            className="bg-transparent text-xs text-white outline-none flex-1"
                                        />
                                    </div>
                                </div>
                                <input
                                    value={draft.note}
                                    onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                                    placeholder="Izoh (ixtiyoriy)..."
                                    className="w-full bg-transparent text-xs text-white placeholder:text-[rgba(80,100,150,0.50)] outline-none border-b mb-3 pb-1"
                                    style={{ borderColor: "rgba(43,62,232,0.20)" }}
                                />
                                <div className="flex gap-2">
                                    <button onClick={saveItem}
                                        className="flex-1 py-2 rounded-xl text-xs font-black text-white"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                                        Saqlash
                                    </button>
                                    <button onClick={() => setCreating(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(140,160,210,0.70)" }}>
                                        Bekor
                                    </button>
                                </div>
                            </div>
                        )}

                        {dayItems.length === 0 && !creating && (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <Calendar className="w-10 h-10" style={{ color: "rgba(43,62,232,0.25)" }} />
                                <p className="text-sm" style={{ color: "rgba(80,100,150,0.50)" }}>Bu kun uchun reja yo'q</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            {dayItems.map(item => {
                                const TIcon = TYPE_ICONS[item.type];
                                const color = TYPE_COLORS[item.type];
                                return (
                                    <div key={item.id}
                                        className="flex items-center gap-3 p-3 rounded-xl"
                                        style={{ background: "rgba(11,18,40,0.60)", border: `1px solid ${color}25` }}>
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${color}20` }}>
                                            <TIcon className="w-4 h-4" style={{ color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-bold text-white truncate">{item.title}</p>
                                                {item.published && (
                                                    <span className="text-[8px] px-1.5 py-0.5 rounded font-black"
                                                        style={{ background: "rgba(16,185,129,0.20)", color: "#10B981" }}>
                                                        JOYLANDI
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-2.5 h-2.5" style={{ color: "rgba(80,100,150,0.60)" }} />
                                                <span className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>{item.time}</span>
                                                {item.note && (
                                                    <span className="text-[10px] truncate" style={{ color: "rgba(80,100,150,0.50)" }}>
                                                        · {item.note}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button onClick={() => togglePublished(item.id)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg"
                                                style={{ background: item.published ? "rgba(16,185,129,0.20)" : "rgba(43,62,232,0.12)" }}>
                                                <Check className="w-3.5 h-3.5" style={{ color: item.published ? "#10B981" : "rgba(140,160,210,0.50)" }} />
                                            </button>
                                            <button onClick={() => deleteItem(item.id)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg"
                                                style={{ background: "rgba(239,68,68,0.10)" }}>
                                                <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* All upcoming */}
                    <div className="px-5 pb-6">
                        <p className="text-xs font-black text-white mb-2">Barcha rejalashtirilganlar</p>
                        <div className="flex flex-col gap-2">
                            {items.filter(i => i.date >= toYMD(today.getFullYear(), today.getMonth(), today.getDate())).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map(item => {
                                const TIcon = TYPE_ICONS[item.type];
                                const color = TYPE_COLORS[item.type];
                                return (
                                    <div key={item.id}
                                        onClick={() => setSelectedDate(item.date)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
                                        style={{ background: "rgba(11,18,40,0.40)", border: "1px solid rgba(43,62,232,0.10)" }}>
                                        <TIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{item.title}</p>
                                        </div>
                                        <span className="text-[9px] font-bold flex-shrink-0"
                                            style={{ color: "rgba(80,100,150,0.60)" }}>
                                            {item.date} {item.time}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
