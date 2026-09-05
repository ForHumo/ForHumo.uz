"use client";

// Humo super-app onboarding tour - birinchi marta /humo ochilganda.

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, ChevronLeft, ChevronRight, Check, LayoutDashboard, Bell, Search, Bot, Calendar } from "lucide-react";

const STORAGE_KEY = "humo-tour-done-v1";

const STEPS = [
    {
        icon: LayoutDashboard,
        color: "#3b82f6",
        title: "Salom! Bu Humo panelingiz",
        body: "Barcha modul (BN, Belis, Nexus, Pay, Market, Support) bir joyda. Aktiv buyurtmalar, balans, yangi bildirishnomalar - hammasi darhol ko'rinadi.",
    },
    {
        icon: Bell,
        color: "#ec4899",
        title: "Bildirishnomalar bir joyda",
        body: "Yuqori-o'ngdagi qo'ng'iroq tugmasi - barcha modul yangiliklar. Har qaysi modul o'z rangida. Bir bosishda barchasini o'qildi qilasiz.",
    },
    {
        icon: Search,
        color: "#a855f7",
        title: "Ctrl+K bilan tez qidiruv",
        body: "Istalgan joyda Ctrl+K (yoki Cmd+K) bosing - mahsulot, do'kon, video, foydalanuvchi topasiz. Klaviaturadan chiqmasdan.",
    },
    {
        icon: Bot,
        color: "#8b5cf6",
        title: "Humo AI - shaxsiy yordamchi",
        body: "O'ng-past 'Humo AI' tugmasini bosing va o'zbek tilida savol bering. Masalan: 'Bu oy qancha sarfladim?' - AI barcha modul bo'yicha javob beradi.",
    },
    {
        icon: Calendar,
        color: "#eab308",
        title: "Kalendar - cross-modul",
        body: "Belis marosim, BN buyurtma, Support tiket - hammasi bitta kalendarda. Modul karta orasidan 'Kalendar' ni bosing.",
    },
];

export function HumoTour() {
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        setMounted(true);
        try {
            if (!localStorage.getItem(STORAGE_KEY)) {
                // 1s kutib ochamiz (sahifa yuklanishi uchun)
                setTimeout(() => setOpen(true), 1200);
            }
        } catch { /* skip */ }
    }, []);

    const done = () => {
        try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* skip */ }
        setOpen(false);
    };

    if (!mounted || !open) return null;

    const s = STEPS[step];
    const Icon = s.icon;
    const isLast = step === STEPS.length - 1;

    return createPortal(
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-full max-w-md rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 shadow-2xl">
                {/* Header */}
                <div className="p-5 flex items-center gap-3 text-white"
                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}>
                    <span className="w-11 h-11 rounded-xl grid place-items-center bg-white/20 backdrop-blur-sm">
                        <Icon className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10.5px] font-black uppercase tracking-widest text-white/85">
                            Qadam {step + 1} / {STEPS.length}
                        </p>
                        <p className="text-[16px] font-black leading-tight">{s.title}</p>
                    </div>
                    <button onClick={done}
                        className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/20 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    <p className="text-[13.5px] text-neutral-700 dark:text-neutral-300 leading-relaxed">{s.body}</p>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mb-3">
                    {STEPS.map((_, i) => (
                        <span key={i}
                            className={`h-1.5 rounded-full transition-all ${i === step ? "w-6" : "w-1.5"}`}
                            style={{ background: i <= step ? s.color : "#e5e5e5" }} />
                    ))}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                    <button onClick={done}
                        className="h-10 px-4 rounded-lg text-[12.5px] font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        O'tkazib yuborish
                    </button>
                    <div className="flex-1" />
                    {step > 0 && (
                        <button onClick={() => setStep(s => s - 1)}
                            className="h-10 w-10 rounded-lg grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => isLast ? done() : setStep(s => s + 1)}
                        className="h-10 px-4 rounded-lg text-[13px] font-black text-white inline-flex items-center gap-1 hover:brightness-95"
                        style={{ background: s.color }}>
                        {isLast ? <>Tugatish <Check className="w-4 h-4" /></> : <>Keyingi <ChevronRight className="w-4 h-4" /></>}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
