"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDaysInMonth, startOfMonth, getDay, addMonths, subMonths, isAfter, format } from "date-fns";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

interface Props {
    value: string; // "YYYY-MM-DD" or ""
    onChange: (val: string) => void;
    placeholder?: string;
    maxDate?: Date;
}

const MONTHS_BY_LOCALE: Record<string, string[]> = {
    uz: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
    ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const WEEKDAYS_BY_LOCALE: Record<string, string[]> = {
    uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
    ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
};

export function DatePickerCalendar({ value, onChange, placeholder = "KK.OO.YYYY", maxDate }: Props) {
    const tCommon = useTranslations("Common");
    const params = useParams();
    const locale = (params?.locale as string) ?? "uz";
    const MONTHS = MONTHS_BY_LOCALE[locale] ?? MONTHS_BY_LOCALE.uz;
    const WEEKDAYS = WEEKDAYS_BY_LOCALE[locale] ?? WEEKDAYS_BY_LOCALE.uz;

    const today = maxDate ?? new Date();
    const parsed = value ? new Date(value + "T12:00:00") : null;

    const [open, setOpen] = useState(false);
    const [view, setView] = useState<Date>(
        parsed ?? new Date(today.getFullYear() - 20, today.getMonth(), 1)
    );
    const [monthOpen, setMonthOpen] = useState(false);
    const [yearOpen, setYearOpen] = useState(false);

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setMonthOpen(false);
                setYearOpen(false);
            }
        }
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const year = view.getFullYear();
    const month = view.getMonth();
    const daysInMonth = getDaysInMonth(view);
    const firstWeekday = (getDay(startOfMonth(view)) + 6) % 7; // Mon=0
    const blanks = Array(firstWeekday).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const years = Array.from({ length: 100 }, (_, i) => today.getFullYear() - i);

    function selectDay(day: number) {
        const d = new Date(year, month, day);
        if (isAfter(d, today)) return;
        onChange(format(d, "yyyy-MM-dd"));
        setOpen(false);
    }

    function isSelectable(day: number) {
        return !isAfter(new Date(year, month, day), today);
    }

    const displayValue = parsed ? format(parsed, "dd.MM.yyyy") : "";
    const canGoNext = !isAfter(addMonths(view, 1), today);

    return (
        <div ref={ref} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setMonthOpen(false); setYearOpen(false); }}
                className="w-full flex items-center justify-between gap-3 bg-background/60 border border-border/60 rounded-xl px-4 py-3 text-sm transition-all hover:border-border focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            >
                <span className={displayValue ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {displayValue || placeholder}
                </span>
                <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-card border border-border/60 rounded-xl shadow-2xl p-4 min-w-[280px]"
                    >
                        {/* Header: prev / month+year / next */}
                        <div className="flex items-center justify-between mb-3 gap-1">
                            <button
                                type="button"
                                onClick={() => setView(subMonths(view, 1))}
                                className="p-1.5 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            {/* Month picker */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setMonthOpen((o) => !o); setYearOpen(false); }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted/80 text-sm font-semibold text-foreground transition-colors"
                                >
                                    {MONTHS[month]}
                                    <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <AnimatePresence>
                                    {monthOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                            transition={{ duration: 0.12 }}
                                            className="absolute top-full mt-1 left-0 z-10 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-[120px]"
                                        >
                                            <div className="max-h-48 overflow-y-auto py-1">
                                                {MONTHS.map((m, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => { setView(new Date(year, i, 1)); setMonthOpen(false); }}
                                                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                                                            i === month
                                                                ? "bg-blue-500/15 text-blue-400 font-semibold"
                                                                : "hover:bg-muted/70 text-foreground"
                                                        }`}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Year picker */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setYearOpen((o) => !o); setMonthOpen(false); }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted/80 text-sm font-semibold text-foreground transition-colors"
                                >
                                    {year}
                                    <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <AnimatePresence>
                                    {yearOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                            transition={{ duration: 0.12 }}
                                            className="absolute top-full mt-1 right-0 z-10 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-[80px]"
                                        >
                                            <div className="max-h-48 overflow-y-auto py-1">
                                                {years.map((y) => (
                                                    <button
                                                        key={y}
                                                        type="button"
                                                        onClick={() => { setView(new Date(y, month, 1)); setYearOpen(false); }}
                                                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                                                            y === year
                                                                ? "bg-blue-500/15 text-blue-400 font-semibold"
                                                                : "hover:bg-muted/70 text-foreground"
                                                        }`}
                                                    >
                                                        {y}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                type="button"
                                onClick={() => { if (canGoNext) setView(addMonths(view, 1)); }}
                                disabled={!canGoNext}
                                className="p-1.5 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* Weekday labels */}
                        <div className="grid grid-cols-7 mb-1">
                            {WEEKDAYS.map((d) => (
                                <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Day grid */}
                        <div className="grid grid-cols-7 gap-y-0.5">
                            {blanks.map((_, i) => <div key={`b${i}`} />)}
                            {days.map((day) => {
                                const sel =
                                    parsed &&
                                    parsed.getFullYear() === year &&
                                    parsed.getMonth() === month &&
                                    parsed.getDate() === day;
                                const ok = isSelectable(day);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        disabled={!ok}
                                        onClick={() => selectDay(day)}
                                        className={`h-8 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all
                                            ${sel
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : ok
                                                    ? "hover:bg-muted/70 text-foreground"
                                                    : "text-muted-foreground/30 cursor-not-allowed"
                                            }`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Clear */}
                        {value && (
                            <button
                                type="button"
                                onClick={() => { onChange(""); setOpen(false); }}
                                className="mt-3 w-full text-xs text-muted-foreground hover:text-red-400 text-center py-1.5 border-t border-border/60 transition-colors"
                            >
                                {tCommon("clear")}
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
