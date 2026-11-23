"use client";

// For Humo eSport — maxsus sana tanlagich (brauzerning native kalendari o'rnida).
// value/onChange: "YYYY-MM-DD". Premium, animatsion, es-* brend ranglarida.
//
// 3 bosqichli navigatsiya:
//   • KUN ko'rinishi  — oy nomini bossang → OY ko'rinishi; yilni bossang → YIL ko'rinishi.
//   • OY ko'rinishi   — 12 oy; o'q yilni ±1 qiladi; sarlavha (yil) bosilsa → YIL ko'rinishi.
//   • YIL ko'rinishi  — 12 yil; o'q 12 yilга suriladi; yil bosilsa → OY ko'rinishi.
//
// MUHIM: kalendar oynasi PORTAL orqали `.es-bg` shell'ga chiqariladi va
// `position:fixed` bilan joylashtiriladi. Sababi: `.et-glass` kartalar
// `overflow:hidden` + `backdrop-filter` ga ega — backdrop-filter kartani
// `fixed` elementlar uchun ham containing-block qiladi, shuning uchun karta
// ichida qolgan popup pastdan kesiladi. `.es-bg` ichida (karta tashqarisida)
// --es-*/--et-* o'zgaruvchilar baribir yechiladi, lekin hech bir karta kesmaydi.

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MON = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const MON_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const MON_GRID = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
const DOW = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

const CAL_W = 300;   // popup kengligi (px)
const CAL_H = 390;   // taxminiy balandlik (flip qarori uchun)

type Mode = "day" | "month" | "year";

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
    const [mode, setMode] = useState<Mode>("day");
    const [view, setView] = useState<Date>(() => (sel ? new Date(sel.getFullYear(), sel.getMonth(), 1) : new Date()));
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
    const ref = useRef<HTMLDivElement>(null);   // trigger konteyneri
    const popRef = useRef<HTMLDivElement>(null); // portal popup

    // Trigger rect'iga qarab fixed pozitsiyani hisoblaydi (viewport ichida ushlab turadi).
    const computePos = useCallback((estH: number) => {
        const el = ref.current;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const width = Math.min(CAL_W, vw - 16);
        let left = r.left;
        if (left + width > vw - 8) left = vw - 8 - width;
        if (left < 8) left = 8;
        let top = r.bottom + 10;                         // odatda trigger ostida
        if (top + estH > vh - 8 && r.top - 10 - estH > 8) top = r.top - 10 - estH; // joy yo'q → ustiga
        return { top, left, width };
    }, []);

    const place = useCallback(() => {
        const p = computePos(popRef.current?.offsetHeight || CAL_H);
        if (p) setPos(p);
    }, [computePos]);

    const toggle = useCallback(() => {
        setOpen(o => {
            if (!o) {
                setMode("day");
                setPortalEl((ref.current?.closest(".es-bg") as HTMLElement) ?? document.body);
                const p = computePos(CAL_H);
                if (p) setPos(p);
            }
            return !o;
        });
    }, [computePos]);

    // Ochiq bo'lганда: o'lchangan balandlik bilan qayta joylash + scroll/resize kuzatuvi.
    useEffect(() => {
        if (!open) return;
        place();
        const on = () => place();
        window.addEventListener("scroll", on, true);
        window.addEventListener("resize", on);
        return () => {
            window.removeEventListener("scroll", on, true);
            window.removeEventListener("resize", on);
        };
    }, [open, view, mode, place]);

    // Tashqariga bosilsa yopiladi (trigger ham, portal popup ham hisobga olinadi).
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => {
            const t = e.target as Node;
            if (ref.current?.contains(t)) return;
            if (popRef.current?.contains(t)) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [open]);

    const pick = useCallback((d: Date) => { onChange(toYMD(d)); setOpen(false); setMode("day"); }, [onChange]);

    const y = view.getFullYear(), m = view.getMonth();
    const today = new Date();

    // KUN ko'rinishi uchun kataklar (Monday-first)
    const startDow = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const cells: { d: number; mute: boolean; date: Date | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ d: prevDays - startDow + 1 + i, mute: true, date: null });
    for (let d = 1; d <= days; d++) cells.push({ d, mute: false, date: new Date(y, m, d) });
    const trail = (startDow + days) % 7;
    if (trail) for (let t = 1; t <= 7 - trail; t++) cells.push({ d: t, mute: true, date: null });

    // YIL ko'rinishi uchun 12 yillik sahifa (view yiliga moslab)
    const yearBase = Math.floor(y / 12) * 12;
    const years = Array.from({ length: 12 }, (_, i) => yearBase + i);

    const popup = (
        <div ref={popRef} className="et-cal" role="dialog"
            style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width ?? CAL_W, zIndex: 200, opacity: 1, transform: "none", pointerEvents: "auto" }}>

            {/* SARLAVHA + O'QLAR — rejimga qarab */}
            <div className="et-cal-head">
                <div className="et-cal-title">
                    {mode === "day" && (<>
                        <button type="button" className="et-cal-tbtn" onClick={() => setMode("month")}>{MON[m]}</button>
                        <button type="button" className="et-cal-tbtn yr" onClick={() => setMode("year")}>{y}</button>
                    </>)}
                    {mode === "month" && (
                        <button type="button" className="et-cal-tbtn yr" onClick={() => setMode("year")}>{y}</button>
                    )}
                    {mode === "year" && (
                        <span className="et-cal-trange">{years[0]} – {years[11]}</span>
                    )}
                </div>
                <div className="et-cal-nav">
                    <button type="button" aria-label="Oldingi" onClick={() => {
                        if (mode === "day") setView(new Date(y, m - 1, 1));
                        else if (mode === "month") setView(new Date(y - 1, m, 1));
                        else setView(new Date(y - 12, m, 1));
                    }}><ChevronLeft size={16} /></button>
                    <button type="button" aria-label="Keyingi" onClick={() => {
                        if (mode === "day") setView(new Date(y, m + 1, 1));
                        else if (mode === "month") setView(new Date(y + 1, m, 1));
                        else setView(new Date(y + 12, m, 1));
                    }}><ChevronRight size={16} /></button>
                </div>
            </div>

            {/* KUN ko'rinishi */}
            {mode === "day" && (<>
                <div className="et-cal-dow">{DOW.map(d => <span key={d}>{d}</span>)}</div>
                <div className="et-cal-grid">
                    {cells.map((c, i) => {
                        if (c.mute || !c.date) return <button key={i} type="button" className="et-cal-d mute" tabIndex={-1} disabled>{c.d}</button>;
                        const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === c.d;
                        const isSel = !!sel && sel.getFullYear() === y && sel.getMonth() === m && sel.getDate() === c.d;
                        return <button key={i} type="button" className={`et-cal-d${isToday ? " today" : ""}${isSel ? " sel" : ""}`} onClick={() => pick(c.date!)}>{c.d}</button>;
                    })}
                </div>
            </>)}

            {/* OY ko'rinishi */}
            {mode === "month" && (
                <div className="et-cal-mg">
                    {MON_GRID.map((label, i) => {
                        const isCur = today.getFullYear() === y && today.getMonth() === i;
                        const isSel = !!sel && sel.getFullYear() === y && sel.getMonth() === i;
                        return <button key={label} type="button" className={`et-cal-my${isCur ? " today" : ""}${isSel ? " sel" : ""}`}
                            onClick={() => { setView(new Date(y, i, 1)); setMode("day"); }}>{label}</button>;
                    })}
                </div>
            )}

            {/* YIL ko'rinishi */}
            {mode === "year" && (
                <div className="et-cal-mg">
                    {years.map(yr => {
                        const isCur = today.getFullYear() === yr;
                        const isSel = !!sel && sel.getFullYear() === yr;
                        return <button key={yr} type="button" className={`et-cal-my${isCur ? " today" : ""}${isSel ? " sel" : ""}`}
                            onClick={() => { setView(new Date(yr, m, 1)); setMode("month"); }}>{yr}</button>;
                    })}
                </div>
            )}

            <div className="et-cal-foot">
                <button type="button" onClick={() => { const n = new Date(); setView(new Date(n.getFullYear(), n.getMonth(), 1)); pick(n); }}>Bugun</button>
                <button type="button" onClick={() => { onChange(""); setOpen(false); setMode("day"); }}>Tozalash</button>
            </div>
        </div>
    );

    return (
        <div className={`et-dt${open ? " open" : ""}`} ref={ref} style={{ position: "relative" }}>
            <button type="button" className="et-dt-trigger" onClick={toggle} aria-haspopup="dialog" aria-expanded={open}>
                <span className="ic"><Calendar size={16} /></span>
                <span className="val">{sel ? `${sel.getDate()} ${MON_SHORT[sel.getMonth()]} ${sel.getFullYear()}` : <span className="ph">{placeholder}</span>}</span>
                <ChevronDown size={16} className="chev" />
            </button>

            {open && portalEl && createPortal(popup, portalEl)}
        </div>
    );
}
