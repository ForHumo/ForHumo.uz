"use client";

// For Humo eSport — maxsus sana tanlagich (brauzerning native kalendari o'rnida).
// value/onChange: "YYYY-MM-DD". Premium, animatsion, es-* brend ranglarida.

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MON = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const MON_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const DOW = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function parseYMD(s: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function toYMD(d: Date): string {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export function EtDatePicker({ value, onChange, placeholder = "Sanani tanlang" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    const sel = parseYMD(value);
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<Date>(() => (sel ? new Date(sel.getFullYear(), sel.getMonth(), 1) : new Date()));
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [open]);

    const pick = useCallback((d: Date) => { onChange(toYMD(d)); setOpen(false); }, [onChange]);

    const y = view.getFullYear(), m = view.getMonth();
    const startDow = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
    const days = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const today = new Date();
    const cells: { d: number; mute: boolean; date: Date | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ d: prevDays - startDow + 1 + i, mute: true, date: null });
    for (let d = 1; d <= days; d++) cells.push({ d, mute: false, date: new Date(y, m, d) });
    const trail = (startDow + days) % 7;
    if (trail) for (let t = 1; t <= 7 - trail; t++) cells.push({ d: t, mute: true, date: null });

    return (
        <div className="et-dt" ref={ref} style={{ position: "relative" }}>
            <button type="button" className="et-dt-trigger" onClick={() => setOpen(o => !o)} aria-haspopup="dialog" aria-expanded={open}
                style={open ? { borderColor: "var(--es-c2)", boxShadow: "0 0 0 3px color-mix(in oklab,var(--es-c2) 22%,transparent)" } : undefined}>
                <span className="ic"><Calendar size={16} /></span>
                <span className="val">{sel ? `${sel.getDate()} ${MON_SHORT[sel.getMonth()]} ${sel.getFullYear()}` : <span className="ph">{placeholder}</span>}</span>
                <ChevronDown size={16} className="chev" style={open ? { transform: "rotate(180deg)" } : undefined} />
            </button>

            {open && (
                <div className="et-cal" style={{ opacity: 1, transform: "none", pointerEvents: "auto" }} role="dialog">
                    <div className="et-cal-head">
                        <div className="et-cal-title">{MON[m]} <span>{y}</span></div>
                        <div className="et-cal-nav">
                            <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} aria-label="Oldingi oy"><ChevronLeft size={16} /></button>
                            <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Keyingi oy"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                    <div className="et-cal-dow">{DOW.map(d => <span key={d}>{d}</span>)}</div>
                    <div className="et-cal-grid">
                        {cells.map((c, i) => {
                            if (c.mute || !c.date) return <button key={i} type="button" className="et-cal-d mute" tabIndex={-1} disabled>{c.d}</button>;
                            const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === c.d;
                            const isSel = !!sel && sel.getFullYear() === y && sel.getMonth() === m && sel.getDate() === c.d;
                            return <button key={i} type="button" className={`et-cal-d${isToday ? " today" : ""}${isSel ? " sel" : ""}`} onClick={() => pick(c.date!)}>{c.d}</button>;
                        })}
                    </div>
                    <div className="et-cal-foot">
                        <button type="button" onClick={() => { const n = new Date(); setView(new Date(n.getFullYear(), n.getMonth(), 1)); pick(n); }}>Bugun</button>
                        <button type="button" onClick={() => { onChange(""); setOpen(false); }}>Tozalash</button>
                    </div>
                </div>
            )}
        </div>
    );
}
