"use client";

// Bozor Narxida — Faza 0 (coming soon).
// Domen faollashgach avtomatik ko'rinadi. Bu sahifa bozornarxida.uz/ orqali
// yoki forhumo.uz/uz/bn/ orqali kirilganda ko'rinadi (bir kontent, ikki URL).

import { useEffect, useState } from "react";
import { Store, Truck, ShieldCheck, Wallet, Sparkles, Clock, Mail } from "lucide-react";

const LAUNCH_TARGET = new Date("2026-09-15T09:00:00+05:00").getTime();

function fmtRemaining(ms: number): { days: number; hours: number; mins: number; secs: number } {
    if (ms <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
    const s = Math.floor(ms / 1000);
    return {
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        mins: Math.floor((s % 3600) / 60),
        secs: s % 60,
    };
}

export function BnComingSoon() {
    const [remaining, setRemaining] = useState(fmtRemaining(LAUNCH_TARGET - Date.now()));
    const [email, setEmail] = useState("");
    const [notified, setNotified] = useState(false);

    useEffect(() => {
        const iv = setInterval(() => setRemaining(fmtRemaining(LAUNCH_TARGET - Date.now())), 1000);
        return () => clearInterval(iv);
    }, []);

    function subscribe(e: React.FormEvent) {
        e.preventDefault();
        // TODO: backend endpoint (keyingi bosqichda)
        if (email.trim()) setNotified(true);
    }

    const features = [
        { Icon: Store, title: "Bozor narxida", desc: "Sergeli mashina bozori — real vaqtdagi narxlar" },
        { Icon: ShieldCheck, title: "Ishonchli sotuvchilar", desc: "Barcha sotuvchilar YaTT bilan tasdiqlangan" },
        { Icon: Truck, title: "Yetkazib berish", desc: "Yandex Delivery / BTS Express bilan" },
        { Icon: Wallet, title: "Barcha to'lov usullari", desc: "Google Pay, Apple Pay, Uzum, Click, Payme" },
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
            {/* Fon effekti */}
            <div className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                    background: "radial-gradient(circle at 20% 30%, rgba(43,62,232,0.20), transparent 50%), radial-gradient(circle at 80% 70%, rgba(234,179,8,0.15), transparent 50%)",
                }} />

            <div className="relative w-full max-w-3xl text-center">
                {/* Logo/monogram — RN (bozor narxida) */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
                    style={{
                        background: "linear-gradient(135deg, #000 0%, #1a1a1a 100%)",
                        border: "2px solid #EAB308",
                        boxShadow: "0 0 40px rgba(234,179,8,0.25)",
                    }}>
                    <span className="text-2xl font-black" style={{ color: "#EAB308", fontFamily: "serif" }}>BN</span>
                </div>

                {/* Sarlavha */}
                <h1 className="text-4xl sm:text-5xl font-black mb-3" style={{ letterSpacing: "-0.03em" }}>
                    Bozor Narxida
                </h1>
                <p className="text-base sm:text-lg mb-10" style={{ color: "rgba(200,200,200,0.75)" }}>
                    Sergeli mashina bozori endi onlayn — ehtiyot qismlar, aksessuarlar
                </p>

                {/* Countdown */}
                <div className="mb-10">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(234,179,8,0.75)" }}>
                        Ochilishgacha
                    </p>
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                        {[
                            { val: remaining.days, label: "kun" },
                            { val: remaining.hours, label: "soat" },
                            { val: remaining.mins, label: "daqiqa" },
                            { val: remaining.secs, label: "soniya" },
                        ].map((x, i) => (
                            <div key={i} className="flex flex-col items-center min-w-[64px] sm:min-w-[80px]">
                                <div className="w-full px-3 py-3 rounded-xl text-2xl sm:text-3xl font-black tabular-nums"
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(234,179,8,0.20)", color: "#EAB308" }}>
                                    {String(x.val).padStart(2, "0")}
                                </div>
                                <p className="text-[10px] mt-1.5 uppercase tracking-wider" style={{ color: "rgba(200,200,200,0.60)" }}>
                                    {x.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feature grid */}
                <div className="grid grid-cols-2 gap-3 mb-10">
                    {features.map((f, i) => (
                        <div key={i} className="p-4 rounded-xl text-left flex items-start gap-3"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.20)" }}>
                                <f.Icon className="w-4 h-4" style={{ color: "#EAB308" }} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white mb-0.5">{f.title}</p>
                                <p className="text-[11px]" style={{ color: "rgba(200,200,200,0.65)" }}>{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Email notify */}
                {notified ? (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl"
                        style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
                        <Sparkles className="w-4 h-4" style={{ color: "#10B981" }} />
                        <p className="text-sm text-white">Rahmat! Ochilishimiz haqida email yuboramiz</p>
                    </div>
                ) : (
                    <form onSubmit={subscribe} className="flex gap-2 max-w-md mx-auto">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(200,200,200,0.5)" }} />
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="Emailingiz — biz xabar beramiz"
                                className="w-full h-11 rounded-xl pl-10 pr-3 text-sm text-white outline-none"
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }} />
                        </div>
                        <button type="submit" className="px-5 h-11 rounded-xl text-xs font-black text-black"
                            style={{ background: "#EAB308" }}>
                            Xabar bering
                        </button>
                    </form>
                )}

                {/* Footer */}
                <div className="mt-12 flex items-center justify-center gap-2 text-[11px]" style={{ color: "rgba(200,200,200,0.5)" }}>
                    <Clock className="w-3 h-3" />
                    <span>For Humo tomonidan qo&apos;llab-quvvatlanadi</span>
                </div>
            </div>
        </div>
    );
}
