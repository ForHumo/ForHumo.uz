"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Package, Phone, Truck, Crown, Database, RefreshCw } from "lucide-react";

const BLUE = "#2563EB", CYAN = "#22D3EE";

interface Stats {
    totals: {
        listings: { total: number; active: number; cargo: number; truck: number };
        sources: { total: number; active: number };
        reveals: { total: number; last7d: number; engagedUsers: number };
        registrations: { telegram: number; last7d: number };
        drivers: { total: number; withRoute: number; notify: number; pro: number };
    };
    daily: { day: string; listings: number; reveals: number; registrations: number; drivers: number }[];
}

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
    return (
        <div className="rounded-2xl p-4" style={{ background: "#0E1528", border: "1px solid rgba(37,99,235,0.25)" }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: "#9FB3D9" }}>
                {icon}<span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-2xl font-black text-white">{value.toLocaleString("ru-RU")}</div>
            {sub && <div className="text-[11px] mt-0.5" style={{ color: "#6B7A99" }}>{sub}</div>}
        </div>
    );
}

export function YukGoAdmin() {
    const [data, setData] = useState<Stats | null>(null);
    const [status, setStatus] = useState<"loading" | "ok" | "forbidden" | "error">("loading");

    const load = async () => {
        setStatus("loading");
        try {
            const r = await fetch("/api/yukgo/admin/stats", { cache: "no-store" });
            if (r.status === 403 || r.status === 401) { setStatus("forbidden"); return; }
            if (!r.ok) { setStatus("error"); return; }
            setData(await r.json()); setStatus("ok");
        } catch { setStatus("error"); }
    };
    useEffect(() => { load(); }, []);

    if (status === "loading") return (
        <div className="min-h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: CYAN }} /></div>
    );
    if (status === "forbidden") return (
        <div className="min-h-full flex items-center justify-center px-6">
            <p className="text-center text-sm" style={{ color: "#9FB3D9" }}>Bu sahifa faqat administrator uchun. Asosiy (founder) hisob bilan kiring.</p>
        </div>
    );
    if (status === "error" || !data) return (
        <div className="min-h-full flex flex-col items-center justify-center gap-3 px-6">
            <p className="text-sm" style={{ color: "#9FB3D9" }}>Ma'lumot yuklanmadi.</p>
            <button onClick={load} className="px-4 h-10 rounded-xl text-sm font-black text-white" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>Qayta urinish</button>
        </div>
    );

    const t = data.totals;
    const maxReveal = Math.max(1, ...data.daily.map(d => d.reveals));

    return (
        <div className="min-h-full px-4 py-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-xl font-black text-white">YukGo — Statistika</h1>
                    <p className="text-[11px] mt-0.5" style={{ color: "#6B7A99" }}>1 haftalik test o'lchovi · kirish (visits) Vercel Analytics'да</p>
                </div>
                <button onClick={load} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)" }} title="Yangilash">
                    <RefreshCw className="w-4 h-4" style={{ color: CYAN }} />
                </button>
            </div>

            {/* Funnel KPI */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                <Card icon={<Users className="w-4 h-4" />} label="Ro'yxatdan o'tgan" value={t.registrations.telegram} sub={`+${t.registrations.last7d} (7 kun)`} />
                <Card icon={<Phone className="w-4 h-4" />} label="Kontakt ko'rish" value={t.reveals.total} sub={`+${t.reveals.last7d} (7 kun)`} />
                <Card icon={<Users className="w-4 h-4" />} label="Qiziqqan user" value={t.reveals.engagedUsers} sub="kontakt ochgan" />
                <Card icon={<Package className="w-4 h-4" />} label="Faol e'lon" value={t.listings.active} sub={`${t.listings.cargo} yuk · ${t.listings.truck} mashina`} />
                <Card icon={<Truck className="w-4 h-4" />} label="Haydovchi" value={t.drivers.total} sub={`${t.drivers.notify} push · ${t.drivers.withRoute} yo'nalishli`} />
                <Card icon={<Crown className="w-4 h-4" />} label="Pro obuna" value={t.drivers.pro} sub="faol" />
            </div>

            {/* Manba + e'lon jami */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <Card icon={<Database className="w-4 h-4" />} label="Manba (guruh)" value={t.sources.active} sub={`${t.sources.total} jami`} />
                <Card icon={<Package className="w-4 h-4" />} label="E'lon (jami)" value={t.listings.total} sub={`${t.listings.active} faol`} />
            </div>

            {/* 7 kunlik — kontakt ko'rish (asosiy signal) */}
            <div className="rounded-2xl p-4" style={{ background: "#0E1528", border: "1px solid rgba(37,99,235,0.25)" }}>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-4" style={{ color: "#9FB3D9" }}>So'nggi 7 kun — kontakt ko'rish / ro'yxat / e'lon</p>
                <div className="flex items-end justify-between gap-2 h-32">
                    {data.daily.map((d) => {
                        const h = Math.round((d.reveals / maxReveal) * 100);
                        const isToday = d.day === data.daily[data.daily.length - 1].day;
                        return (
                            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                <span className="text-[10px] font-black" style={{ color: isToday ? CYAN : "#9FB3D9" }}>{d.reveals}</span>
                                <div className="w-full rounded-t-md" style={{
                                    height: `${Math.max(h, d.reveals > 0 ? 8 : 2)}%`,
                                    background: isToday ? `linear-gradient(180deg,${CYAN},${BLUE})` : "rgba(37,99,235,0.45)",
                                }} />
                                <span className="text-[9px]" style={{ color: "#4B5B7A" }}>{d.day.slice(5)}</span>
                                <span className="text-[9px]" style={{ color: "#6B7A99" }}>{d.registrations}/{d.listings}</span>
                            </div>
                        );
                    })}
                </div>
                <p className="text-[10px] mt-3 text-center" style={{ color: "#4B5B7A" }}>Ustun = kontakt ko'rish · past raqamlar = ro'yxat / yangi e'lon</p>
            </div>
        </div>
    );
}
