"use client";

// Bosh sahifa reklama banner slayderi (Uzum uslubi, lekin BN uslubida qayta ishlangan).
// 5 ta slayd, avto-aylanish, o'ngga/chapga tugmalar, nuqta indikatorlari.
// FAZA 2 da haqiqiy BnBanner modeli (admin panelidan boshqariladi) bilan almashtiriladi.

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface Slide {
    id: string;
    title: string;
    subtitle: string;
    cta: string;
    href: string;
    /** Ikki rangdan iborat gradient */
    bg: [string, string];
    /** Matn rangi (fonga qarab) */
    ink: string;
    /** Emoji o'rniga — brend so'zi (masalan "TOP", "50%") — kod bilan kattalashtiriladi */
    accent: string;
}

// Mock banner ro'yxati — foundeer/OWNER admin panelidan yangilaydi.
const SLIDES: Slide[] = [
    {
        id: "s1",
        title: "Bozor narxidan 30% gacha arzon",
        subtitle: "Sotuvchilar bir mahsulotni turli narxda qo'yadi — solishtiring va yutib qoling",
        cta: "Arzon mahsulotlarni ko'rish",
        href: "/qidiruv?sort=cheap",
        bg: ["#F5B301", "#B8860B"],
        ink: "#1C1913",
        accent: "-30%",
    },
    {
        id: "s2",
        title: "Ko'rib sotib olish endi onlayn",
        subtitle: "24 soatga band qiling, bozorga borib ko'ring, yoqsa to'lang",
        cta: "Qanday ishlaydi",
        href: "/#inspect",
        bg: ["#28282F", "#17171B"],
        ink: "#F6F4F0",
        accent: "24h",
    },
    {
        id: "s3",
        title: "Sergeli avto bozor — endi telefoningizda",
        subtitle: "148 do'kon, minglab ehtiyot qism. Borib topmasangiz — havolani yuboring, sotuvchi qidiradi",
        cta: "Sergeli bozorni ochish",
        href: "/m/sergeli-avto-bozor",
        bg: ["#3D2E15", "#1F1F25"],
        ink: "#F6F4F0",
        accent: "148",
    },
    {
        id: "s4",
        title: "Do'koningizni onlaynga chiqaring",
        subtitle: "YaTT bilan ariza yuboring — mahsulot rasmini AI yozib beradi. Komissiya 5%, naqddan olinmaydi",
        cta: "Sotuvchi bo'lish",
        href: "/sotuvchi",
        bg: ["#B8860B", "#F5B301"],
        ink: "#1C1913",
        accent: "5%",
    },
    {
        id: "s5",
        title: "Pul kafolat ostida",
        subtitle: "ALKH Pay orqali to'laysiz — qabul qilmaguningizcha sotuvchiga o'tmaydi",
        cta: "Xavfsizlik haqida",
        href: "/#safety",
        bg: ["#15803D", "#0F5E2F"],
        ink: "#F6F4F0",
        accent: "100%",
    },
];

const AUTO_MS = 5500;
const SWIPE_THRESHOLD = 40;

export function BnHeroSlider() {
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);
    const [progress, setProgress] = useState(0);   // 0..100 (progress bar)

    // Swipe (chapga/o'ngga surish)
    const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

    const go = useCallback((n: number) => {
        setIdx(((n % SLIDES.length) + SLIDES.length) % SLIDES.length);
        setProgress(0);
    }, []);

    // Sekin to'ladigan progress bar (~60fps). To'lganda keyingiga o'tadi.
    useEffect(() => {
        if (paused) return;
        setProgress(0);
        const start = performance.now();
        let raf = 0;
        const tick = (t: number) => {
            const p = Math.min(100, ((t - start) / AUTO_MS) * 100);
            setProgress(p);
            if (p >= 100) {
                setIdx(i => (i + 1) % SLIDES.length);
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [paused, idx]);

    function onPointerDown(e: React.PointerEvent) {
        dragRef.current = { x: e.clientX, y: e.clientY, active: true };
        setPaused(true);
    }
    function onPointerUp(e: React.PointerEvent) {
        const d = dragRef.current;
        dragRef.current = null;
        if (!d?.active) { setPaused(false); return; }
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        setPaused(false);
        if (Math.abs(dy) > Math.abs(dx)) return;         // vertikal — skrol
        if (Math.abs(dx) < SWIPE_THRESHOLD) return;
        go(dx < 0 ? idx + 1 : idx - 1);
    }

    return (
        <section
            className="relative overflow-hidden rounded-3xl mb-8 select-none"
            style={{ border: `1px solid ${BN.border}`, touchAction: "pan-y" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { dragRef.current = null; setPaused(false); }}
            data-no-swipe                              /* butun sahifa navbar swipe'ini bloklaydi */
        >
            {/* Slaydlar */}
            <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${idx * 100}%)` }}
            >
                {SLIDES.map(s => (
                    <div
                        key={s.id}
                        className="w-full flex-shrink-0"
                        style={{
                            background: `linear-gradient(135deg, ${s.bg[0]} 0%, ${s.bg[1]} 100%)`,
                            color: s.ink,
                        }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4 p-6 sm:p-8 md:p-10" style={{ minHeight: 210 }}>
                            <div className="min-w-0">
                                <h2 className="text-[22px] sm:text-[28px] md:text-[32px] font-black tracking-tight leading-[1.1] mb-2">
                                    {s.title}
                                </h2>
                                <p className="text-[13px] sm:text-[14.5px] max-w-[520px] leading-relaxed opacity-90 mb-4">
                                    {s.subtitle}
                                </p>
                                <BnLink
                                    href={s.href}
                                    className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.97]"
                                    style={{
                                        background: s.ink,
                                        color: s.bg[0],
                                    }}
                                >
                                    {s.cta}
                                    <ChevronRight className="w-4 h-4" />
                                </BnLink>
                            </div>

                            {/* Aksent — bo'sh joyni to'ldiruvchi katta yozuv */}
                            <div
                                className="hidden md:block text-[130px] font-black leading-none tabular-nums opacity-15 pr-2 select-none"
                                style={{ color: s.ink, letterSpacing: "-0.05em" }}
                                aria-hidden="true"
                            >
                                {s.accent}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pastida: sekin to'ladigan progress bar segmentlari (nuqta o'rniga) */}
            <div className="absolute left-4 right-4 bottom-3 flex items-center gap-1.5">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => go(i)}
                        aria-label={`Slayd ${i + 1}`}
                        className="flex-1 h-1 rounded-full overflow-hidden transition-opacity"
                        style={{ background: "rgba(255,255,255,0.28)" }}
                    >
                        <span
                            className="block h-full rounded-full"
                            style={{
                                width: i < idx ? "100%"
                                    : i === idx ? `${progress}%`
                                    : "0%",
                                background: "#fff",
                                transition: i === idx ? "none" : "width 0.3s",
                            }}
                        />
                    </button>
                ))}
            </div>
        </section>
    );
}
