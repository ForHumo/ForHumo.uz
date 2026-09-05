"use client";

// Cross-modul kalendar - Belis marosim/olish/qaytarish, BN buyurtma, Support.

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Loader2, ArrowLeft } from "lucide-react";

interface CalEvent {
    id: string; source: string; title: string; subtitle?: string;
    date: string; status?: string; href?: string; color: string;
}

const UZ_MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const UZ_WEEK = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function monthGrid(year: number, month: number): (Date | null)[] {
    const first = new Date(year, month, 1);
    const firstDay = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

export function HumoCalendar() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<string | null>(isoDate(today));

    useEffect(() => {
        const from = new Date(year, month, 1);
        const to = new Date(year, month + 1, 0);
        setLoading(true);
        fetch(`/api/user/calendar?from=${isoDate(from)}&to=${isoDate(to)}`, { cache: "no-store" })
            .then(r => r.ok ? r.json() : { events: [] })
            .then(j => setEvents(j.events || []))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, [year, month]);

    const grid = useMemo(() => monthGrid(year, month), [year, month]);
    const eventsByDate = useMemo(() => {
        const m = new Map<string, CalEvent[]>();
        for (const e of events) {
            const arr = m.get(e.date) || [];
            arr.push(e);
            m.set(e.date, arr);
        }
        return m;
    }, [events]);

    const selectedEvents = selected ? eventsByDate.get(selected) || [] : [];

    const prev = () => {
        if (month === 0) { setYear(y => y - 1); setMonth(11); }
        else setMonth(m => m - 1);
    };
    const next = () => {
        if (month === 11) { setYear(y => y + 1); setMonth(0); }
        else setMonth(m => m + 1);
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Sarlavha */}
                <div className="flex items-center gap-3 mb-5">
                    <Link href={"/humo" as never}
                        className="w-10 h-10 rounded-xl grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <span className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: "linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)" }}>
                        <CalIcon className="w-5 h-5 text-white" />
                    </span>
                    <div>
                        <h1 className="text-[22px] font-black leading-tight">Kalendar</h1>
                        <p className="text-[13px] text-neutral-500">Belis, BN, Support - bir joyda</p>
                    </div>
                </div>

                {/* Oy navigatsiya */}
                <div className="flex items-center justify-between mb-4 rounded-2xl p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <button onClick={prev} className="w-9 h-9 rounded-lg grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-[15px] font-black">{UZ_MONTHS[month]} {year}</p>
                    <button onClick={next} className="w-9 h-9 rounded-lg grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    </div>
                )}

                {/* Kalendar grid */}
                <div className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-4">
                    <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800">
                        {UZ_WEEK.map(w => (
                            <div key={w} className="p-2 text-center text-[11px] font-black uppercase tracking-wider text-neutral-500">
                                {w}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {grid.map((d, i) => {
                            if (!d) return <div key={i} className="aspect-square border-r border-b border-neutral-100 dark:border-neutral-800 last-in-row:border-r-0" />;
                            const iso = isoDate(d);
                            const evs = eventsByDate.get(iso) || [];
                            const isToday = iso === isoDate(today);
                            const isSelected = iso === selected;
                            return (
                                <button key={i} onClick={() => setSelected(iso)}
                                    className="aspect-square border-r border-b border-neutral-100 dark:border-neutral-800 p-1.5 text-left flex flex-col items-start relative hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                                    style={{
                                        background: isSelected ? "#dbeafe" : isToday ? "#fef3c7" : undefined,
                                    }}>
                                    <span className={`text-[12px] font-black ${isToday ? "text-yellow-700" : isSelected ? "text-blue-700" : ""}`}>
                                        {d.getDate()}
                                    </span>
                                    {evs.length > 0 && (
                                        <div className="flex flex-wrap gap-0.5 mt-auto">
                                            {evs.slice(0, 3).map((e, k) => (
                                                <span key={k} className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                    style={{ background: e.color }} />
                                            ))}
                                            {evs.length > 3 && (
                                                <span className="text-[9px] font-black text-neutral-500">+{evs.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected day events */}
                {selected && (
                    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                            <p className="text-[13.5px] font-black">
                                {new Date(selected).toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </p>
                        </div>
                        {selectedEvents.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-[12.5px] text-neutral-500">Bu kunda voqea yo'q</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {selectedEvents.map(e => {
                                    const inner = (
                                        <>
                                            <span className="w-2 h-full rounded-full flex-shrink-0" style={{ background: e.color, minHeight: 32 }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold truncate">{e.title}</p>
                                                {e.subtitle && <p className="text-[11.5px] text-neutral-500 truncate">{e.subtitle}</p>}
                                                {e.status && (
                                                    <span className="inline-block mt-0.5 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                                                        style={{ background: e.color + "22", color: e.color }}>
                                                        {e.status}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    );
                                    const cls = "flex items-start gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition";
                                    return e.href ? (
                                        <Link key={e.id} href={e.href as never} className={cls}>{inner}</Link>
                                    ) : (
                                        <div key={e.id} className={cls}>{inner}</div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
