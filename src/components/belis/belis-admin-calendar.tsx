"use client";

// Belis admin — kalendar ko'rinishi.
// Oy jadvali, har kunda booking ranglari:
//   • yashil = REQUESTED (yangi ariza kutib turibdi)
//   • tilla = CONFIRMED (tasdiqlangan)
//   • ko'k = PICKED_UP (olib ketildi)
//   • qizil = LATE (kechikkan)

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, Package } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface Booking {
    id: string;
    code: string;
    status: "REQUESTED" | "CONFIRMED" | "PICKED_UP" | "LATE";
    buyerName: string;
    eventDate: string;
    pickupDate: string;
    returnDate: string;
    komplekt: { slug: string; nameUz: string; kind: string } | null;
}

interface CalendarData {
    year: number;
    month: number;
    monthStart: string;
    monthEnd: string;
    bookings: Booking[];
}

const STATUS_COLOR: Record<Booking["status"], string> = {
    REQUESTED: BELIS.warn,
    CONFIRMED: BELIS.goldDeep,
    PICKED_UP: BELIS.ok,
    LATE:      BELIS.err,
};

const MONTHS_UZ = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];
const WEEKDAYS_UZ = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export function BelisAdminCalendar() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [data, setData] = useState<CalendarData | null>(null);
    const [forbidden, setForbidden] = useState(false);
    const [selected, setSelected] = useState<Date | null>(null);

    const load = useCallback(async () => {
        setData(null);
        const r = await fetch(`/api/belis/admin/calendar?year=${year}&month=${month}`);
        if (r.status === 403) { setForbidden(true); return; }
        const d = await r.json();
        if (r.ok) setData(d);
    }, [year, month]);

    useEffect(() => { load(); }, [load]);

    if (forbidden) {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
                <p className="text-[16px] font-black" style={{ color: BELIS.text }}>Ruxsat yo&apos;q</p>
            </div>
        );
    }

    function prev() {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    }
    function next() {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    }
    function goToday() {
        const t = new Date();
        setYear(t.getFullYear()); setMonth(t.getMonth() + 1); setSelected(t);
    }

    // Sanaga booking'larni guruhlash
    const bookingsByDate: Map<string, Booking[]> = new Map();
    if (data) {
        for (const b of data.bookings) {
            const pickup = new Date(b.pickupDate);
            const ret = new Date(b.returnDate);
            for (let d = new Date(pickup); d <= ret; d.setDate(d.getDate() + 1)) {
                const key = d.toISOString().slice(0, 10);
                if (!bookingsByDate.has(key)) bookingsByDate.set(key, []);
                bookingsByDate.get(key)!.push(b);
            }
        }
    }

    // Oy jadvali qatorlarini yaratish
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const cells: { date: Date | null; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - startWeekday + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
            cells.push({ date: null, isToday: false });
        } else {
            const d = new Date(year, month - 1, dayNum);
            cells.push({ date: d, isToday: d.toISOString().slice(0, 10) === todayStr });
        }
    }

    const selectedKey = selected?.toISOString().slice(0, 10);
    const selectedBookings = selectedKey ? (bookingsByDate.get(selectedKey) ?? []) : [];

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 mb-5">
                <BelisLink href="/belis/admin"
                    className="w-9 h-9 rounded-lg grid place-items-center"
                    style={{ background: BELIS.surface, color: BELIS.text2 }}>
                    <ChevronLeft className="w-4 h-4" />
                </BelisLink>
                <h1 className="text-[22px] font-black flex-1" style={{ color: BELIS.text }}>
                    Kalendar
                </h1>
                <button onClick={goToday}
                    className="h-9 px-3 rounded-lg text-[12px] font-black"
                    style={{ background: BELIS.surface, color: BELIS.text2, border: `1px solid ${BELIS.border}` }}>
                    Bugun
                </button>
            </div>

            {/* Oy navigatsiya */}
            <div className="rounded-2xl p-4 mb-4"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <div className="flex items-center justify-between mb-3">
                    <button onClick={prev} className="w-9 h-9 rounded-lg grid place-items-center"
                        style={{ background: BELIS.bg, color: BELIS.text }}>
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[16px] font-black" style={{ color: BELIS.text }}>
                        {MONTHS_UZ[month - 1]} {year}
                    </span>
                    <button onClick={next} className="w-9 h-9 rounded-lg grid place-items-center"
                        style={{ background: BELIS.bg, color: BELIS.text }}>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {data === null && (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: BELIS.gold }} /></div>
                )}

                {data && (
                    <>
                        {/* Hafta kunlari */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {WEEKDAYS_UZ.map(w => (
                                <div key={w} className="text-[10.5px] font-black text-center uppercase tracking-widest py-1" style={{ color: BELIS.text3 }}>
                                    {w}
                                </div>
                            ))}
                        </div>

                        {/* Oy grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {cells.map((c, i) => {
                                if (!c.date) return <div key={i} />;
                                const key = c.date.toISOString().slice(0, 10);
                                const list = bookingsByDate.get(key) ?? [];
                                const isSelected = selectedKey === key;
                                return (
                                    <button key={i} onClick={() => setSelected(c.date)}
                                        className="aspect-square rounded-lg p-1 flex flex-col items-center text-left transition-colors"
                                        style={{
                                            background: isSelected ? BELIS.goldSoft : c.isToday ? BELIS.bg : "transparent",
                                            border: `1px solid ${isSelected ? BELIS.gold : c.isToday ? BELIS.borderSoft : "transparent"}`,
                                        }}>
                                        <span className="text-[12px] font-black w-full text-center"
                                            style={{ color: c.isToday ? BELIS.goldDeep : BELIS.text }}>
                                            {c.date.getDate()}
                                        </span>
                                        {list.length > 0 && (
                                            <div className="mt-auto w-full flex flex-wrap justify-center gap-0.5">
                                                {list.slice(0, 4).map(b => (
                                                    <span key={b.id} className="w-1.5 h-1.5 rounded-full"
                                                        style={{ background: STATUS_COLOR[b.status] }} />
                                                ))}
                                                {list.length > 4 && (
                                                    <span className="text-[8px] font-black" style={{ color: BELIS.text3 }}>+{list.length - 4}</span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Rang izohi */}
            <div className="flex items-center gap-3 flex-wrap mb-4 text-[11.5px]" style={{ color: BELIS.text2 }}>
                {(["REQUESTED", "CONFIRMED", "PICKED_UP", "LATE"] as Booking["status"][]).map(s => (
                    <div key={s} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                        {s === "REQUESTED" ? "Yangi" : s === "CONFIRMED" ? "Tasdiq" : s === "PICKED_UP" ? "Olib ketildi" : "Kechikkan"}
                    </div>
                ))}
            </div>

            {/* Tanlangan sana */}
            {selected && (
                <div className="rounded-2xl p-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                    <p className="text-[14px] font-black mb-3" style={{ color: BELIS.text }}>
                        {selected.toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" })}
                        <span className="ml-2 text-[12px] font-normal" style={{ color: BELIS.text3 }}>({selectedBookings.length} booking)</span>
                    </p>
                    {selectedBookings.length === 0 ? (
                        <p className="text-[13px] text-center py-4" style={{ color: BELIS.text3 }}>Bu kunga booking yo&apos;q</p>
                    ) : (
                        <div className="space-y-2">
                            {selectedBookings.map(b => (
                                <BelisLink key={b.id} href={`/belis/buyurtma/${b.code}` as never}
                                    className="flex items-center gap-3 p-3 rounded-xl"
                                    style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}` }}>
                                    <span className="w-2 h-10 rounded-full" style={{ background: STATUS_COLOR[b.status] }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-black" style={{ color: BELIS.text }}>{b.buyerName}</p>
                                        <p className="text-[11px]" style={{ color: BELIS.text3 }}>
                                            {b.komplekt?.nameUz ?? "?"} · #{b.code}
                                        </p>
                                    </div>
                                    <Package className="w-4 h-4 flex-shrink-0" style={{ color: BELIS.text3 }} />
                                </BelisLink>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
