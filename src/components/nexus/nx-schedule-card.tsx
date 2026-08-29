"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Clock } from "lucide-react";

interface ScheduleItem {
    id: string;
    kind: string;
    dayOfWeek: number | null;
    dateISO: string | null;
    hour: number;
    minute: number;
    title: string;
    category: string | null;
}

const DAY_NAMES = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const DAY_SHORT = ["Yak", "Du", "Se", "Cho", "Pay", "Ju", "Sh"];

function fmtTime(h: number, m: number) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Streamer profil sahifasi va Live browse hub uchun
export function NxScheduleCard({ username, compact }: { username: string; compact?: boolean }) {
    const [items, setItems] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/nexus/schedule?username=${encodeURIComponent(username)}`)
            .then(r => r.json())
            .then(d => setItems(d.schedule || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [username]);

    if (loading) return null;
    if (items.length === 0) return null;

    return (
        <div className={compact ? "p-3 rounded-xl" : "p-4 rounded-2xl"} style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                <p className={`font-black text-white ${compact ? "text-xs" : "text-sm"}`}>Efir jadvali</p>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded ml-auto" style={{ background: "rgba(16,185,129,0.20)", color: "#34D399" }}>
                    {items.length}
                </span>
            </div>
            <div className="space-y-1">
                {items.map(it => {
                    const isRecurring = it.kind === "RECURRING";
                    return (
                        <div key={it.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.05)" }}>
                            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(52,211,153,0.75)" }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-white truncate">{it.title}</p>
                                <p className="text-[9px]" style={{ color: "rgba(180,240,215,0.75)" }}>
                                    {isRecurring
                                        ? `Har ${DAY_NAMES[it.dayOfWeek ?? 0]}`
                                        : it.dateISO ? new Date(it.dateISO).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" }) : ""}
                                    {" · "}{fmtTime(it.hour, it.minute)}
                                    {it.category && ` · #${it.category}`}
                                </p>
                            </div>
                            {isRecurring && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>
                                    {DAY_SHORT[it.dayOfWeek ?? 0]}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
