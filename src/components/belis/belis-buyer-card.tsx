"use client";

// Belis xaridor kabinet karta - kelasi marosim, jami bookings.
// belis-katalog-page yoki alohida /belis/kabinet sahifada ishlatiladi.

import { useEffect, useState } from "react";
import { Calendar, Clock, Package, TrendingUp, Loader2, ChevronRight } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface Upcoming {
    id: string; code: string; status: string;
    komplektName: string; eventDate: string; pickupDate: string; daysUntil: number;
}
interface Recent {
    id: string; code: string; status: string;
    komplektName: string; image: string | null;
    eventDate: string; rentTotalUzs: number;
}
interface Resp {
    summary: { activeCount: number; yearTotal: number; yearCount: number; totalBookings: number };
    upcoming: Upcoming[];
    recent: Recent[];
}

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }

export function BelisBuyerCard() {
    const [data, setData] = useState<Resp | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/belis/buyer/insights", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(j => setData(j))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="rounded-2xl p-4 mb-4 flex items-center gap-2"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: BELIS.gold }} />
                <span className="text-[12px]" style={{ color: BELIS.text3 }}>Ma'lumot yuklanmoqda…</span>
            </div>
        );
    }
    if (!data || data.summary.totalBookings === 0) return null;

    return (
        <div className="space-y-3 mb-5">
            {/* KPI + jami sarflagan */}
            <div className="rounded-2xl p-4"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4" style={{ color: BELIS.gold }} />
                    <p className="text-[13.5px] font-black" style={{ color: BELIS.text }}>Mening rezervlarim</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg" style={{ background: BELIS.surfaceUp }}>
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BELIS.text3 }}>Aktiv</p>
                        <p className="text-[16px] font-black" style={{ color: BELIS.text }}>{data.summary.activeCount}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: BELIS.surfaceUp }}>
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BELIS.text3 }}>Bu yil</p>
                        <p className="text-[16px] font-black" style={{ color: BELIS.gold }}>{data.summary.yearCount}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: BELIS.surfaceUp }}>
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BELIS.text3 }}>Jami</p>
                        <p className="text-[13.5px] font-black" style={{ color: BELIS.text }}>{fmtSom(data.summary.yearTotal)}</p>
                    </div>
                </div>
            </div>

            {/* Kelasi marosim */}
            {data.upcoming.length > 0 && (
                <div className="rounded-2xl overflow-hidden"
                    style={{ background: BELIS_GOLD_GRADIENT, border: `1px solid ${BELIS.border}` }}>
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4" style={{ color: BELIS.onGold }} />
                            <p className="text-[13.5px] font-black" style={{ color: BELIS.onGold }}>Kelasi marosim</p>
                        </div>
                        {data.upcoming.slice(0, 2).map(u => (
                            <BelisLink key={u.id} href={`/booking/${u.code}` as never}
                                className="block p-3 rounded-xl mt-2"
                                style={{ background: "rgba(0,0,0,0.15)" }}>
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-lg grid place-items-center flex-shrink-0"
                                        style={{ background: BELIS.onGold, color: BELIS.gold }}>
                                        <Clock className="w-5 h-5" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13.5px] font-black truncate" style={{ color: BELIS.onGold }}>
                                            {u.komplektName}
                                        </p>
                                        <p className="text-[11.5px]" style={{ color: BELIS.onGold, opacity: 0.85 }}>
                                            {u.code} · {u.daysUntil > 0 ? `${u.daysUntil} kun qoldi` : u.daysUntil === 0 ? "Bugun!" : "O'tgan"}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BELIS.onGold }} />
                                </div>
                            </BelisLink>
                        ))}
                    </div>
                </div>
            )}

            {/* So'nggi bookings */}
            {data.recent.length > 0 && (
                <div className="rounded-2xl overflow-hidden"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                    <div className="p-3 border-b" style={{ borderColor: BELIS.border }}>
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" style={{ color: BELIS.gold }} />
                            <p className="text-[13px] font-black">So'nggi rezervlar</p>
                        </div>
                    </div>
                    <div className="divide-y" style={{ borderColor: BELIS.border }}>
                        {data.recent.map(r => (
                            <BelisLink key={r.id} href={`/booking/${r.code}` as never}
                                className="flex items-center gap-3 p-3 hover:brightness-95 transition">
                                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0"
                                    style={{ background: BELIS.surfaceUp }}>
                                    {r.image && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.image} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold truncate" style={{ color: BELIS.text }}>{r.komplektName}</p>
                                    <p className="text-[11px]" style={{ color: BELIS.text3 }}>
                                        {r.code} · {r.status}
                                    </p>
                                </div>
                                <p className="text-[12.5px] font-black flex-shrink-0" style={{ color: BELIS.gold }}>
                                    {fmtSom(r.rentTotalUzs)}
                                </p>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BELIS.text3 }} />
                            </BelisLink>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
