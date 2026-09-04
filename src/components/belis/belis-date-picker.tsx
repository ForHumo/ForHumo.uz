"use client";

// Belis brand kalendar. Native <input type="date"> o'rniga ishlatiladi
// (native picker brauzer tilida chiqadi va Belis mavzusiga mos kelmaydi).
// Foydalanuvchi qoidasi: hech qachon native select/date input — doim custom.

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";

interface Props {
    value: string;                  // ISO yyyy-mm-dd
    onChange: (iso: string) => void;
    min?: string;                   // ISO
    max?: string;                   // ISO
    placeholder?: string;
}

const UZ_MONTHS = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];
const UZ_WEEK = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]; // Mon-first

function parseISO(iso: string): Date | null {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}
function fmtISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtUz(iso: string): string {
    const d = parseISO(iso);
    if (!d) return "";
    return `${String(d.getDate()).padStart(2, "0")} ${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date): number { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function BelisDatePicker({ value, onChange, min, max, placeholder }: Props) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<Date>(() => parseISO(value) ?? new Date());
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    useEffect(() => {
        const parsed = parseISO(value);
        if (parsed) setView(parsed);
    }, [value]);

    const today = new Date();
    const minDate = min ? parseISO(min) : null;
    const maxDate = max ? parseISO(max) : null;
    const selected = parseISO(value);

    // Oy panjarasi. Dushanba birinchi.
    const first = startOfMonth(view);
    const firstDow = (first.getDay() + 6) % 7;   // 0=Mon
    const dim = daysInMonth(view);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let i = 1; i <= dim; i++) cells.push(new Date(view.getFullYear(), view.getMonth(), i));
    while (cells.length % 7 !== 0) cells.push(null);

    function isDisabled(d: Date): boolean {
        if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
        if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
        return false;
    }
    function pick(d: Date) {
        if (isDisabled(d)) return;
        onChange(fmtISO(d));
        setOpen(false);
    }
    function shiftMonth(delta: number) {
        setView(v => new Date(v.getFullYear(), v.getMonth() + delta, 1));
    }
    function goToday() {
        setView(new Date(today.getFullYear(), today.getMonth(), 1));
        if (!isDisabled(today)) pick(today);
    }

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="w-full h-12 rounded-xl px-4 text-[15px] font-bold flex items-center justify-between focus:outline-none"
                style={{ background: BELIS.bg, color: value ? BELIS.text : BELIS.text3, border: `1px solid ${open ? BELIS.gold : BELIS.border}` }}>
                <span>{value ? fmtUz(value) : (placeholder ?? "Sanani tanlang")}</span>
                <CalIcon className="w-4 h-4" style={{ color: BELIS.goldDeep }} />
            </button>

            {open && (
                <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl overflow-hidden"
                    style={{
                        background: BELIS.surface,
                        border: `1px solid ${BELIS.border}`,
                        boxShadow: "0 12px 32px rgba(58,53,32,0.18), 0 2px 6px rgba(58,53,32,0.06)",
                    }}>
                    {/* Header: oy/yil + navigatsiya */}
                    <div className="flex items-center justify-between px-3 py-2.5"
                        style={{ borderBottom: `1px solid ${BELIS.borderSoft}` }}>
                        <button type="button" onClick={() => shiftMonth(-1)}
                            className="w-8 h-8 rounded-lg grid place-items-center hover:brightness-95"
                            style={{ background: BELIS.bg, color: BELIS.text2 }}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-[13px] font-black" style={{ color: BELIS.text }}>
                            {UZ_MONTHS[view.getMonth()]} {view.getFullYear()}
                        </div>
                        <button type="button" onClick={() => shiftMonth(1)}
                            className="w-8 h-8 rounded-lg grid place-items-center hover:brightness-95"
                            style={{ background: BELIS.bg, color: BELIS.text2 }}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Hafta kunlari */}
                    <div className="grid grid-cols-7 px-2 pt-2 text-center text-[10px] font-black uppercase tracking-widest"
                        style={{ color: BELIS.text3 }}>
                        {UZ_WEEK.map(d => <div key={d} className="py-1">{d}</div>)}
                    </div>

                    {/* Kunlar */}
                    <div className="grid grid-cols-7 gap-0.5 p-2">
                        {cells.map((d, i) => {
                            if (!d) return <div key={i} />;
                            const dis = isDisabled(d);
                            const sel = selected && sameDay(d, selected);
                            const isToday = sameDay(d, today);
                            return (
                                <button key={i} type="button" onClick={() => pick(d)} disabled={dis}
                                    className="h-9 rounded-lg text-[13px] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{
                                        background: sel ? BELIS_GOLD_GRADIENT : (isToday ? BELIS.goldSoft : "transparent"),
                                        color: sel ? BELIS.onGold : (dis ? BELIS.text3 : BELIS.text),
                                        border: isToday && !sel ? `1px solid ${BELIS.goldDeep}` : "none",
                                    }}>
                                    {d.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer: Bugun / Yopish */}
                    <div className="flex items-center justify-between px-3 py-2"
                        style={{ borderTop: `1px solid ${BELIS.borderSoft}` }}>
                        <button type="button" onClick={goToday}
                            className="text-[12px] font-black" style={{ color: BELIS.goldDeep }}>
                            Bugun
                        </button>
                        <button type="button" onClick={() => setOpen(false)}
                            className="text-[12px] font-black" style={{ color: BELIS.text2 }}>
                            Yopish
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
