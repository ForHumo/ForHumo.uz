"use client";

// Bosh sahifa reklama banner slayderi (Uzum uslubi, lekin BN uslubida qayta ishlangan).
// 5 ta slayd, avto-aylanish, o'ngga/chapga tugmalar, nuqta indikatorlari.
// FAZA 2 da haqiqiy BnBanner modeli (admin panelidan boshqariladi) bilan almashtiriladi.

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

export function BnHeroSlider() {
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);

    const go = useCallback((n: number) => {
        setIdx(((n % SLIDES.length) + SLIDES.length) % SLIDES.length);
    }, []);

    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), AUTO_MS);
        return () => clearInterval(t);
    }, [paused]);

    return (
        <section
            className="relative overflow-hidden rounded-3xl mb-8"
            style={{ border: `1px solid ${BN.border}` }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
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

            {/* Chapga/O'ngga */}
            <button
                type="button"
                onClick={() => go(idx - 1)}
                aria-label="Oldingi"
                className="hidden sm:grid absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 place-items-center rounded-full backdrop-blur-sm transition-transform active:scale-90"
                style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                type="button"
                onClick={() => go(idx + 1)}
                aria-label="Keyingi"
                className="hidden sm:grid absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 place-items-center rounded-full backdrop-blur-sm transition-transform active:scale-90"
                style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Nuqta indikatorlari */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-1.5">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => go(i)}
                        aria-label={`Slayd ${i + 1}`}
                        className="h-1.5 rounded-full transition-all"
                        style={{
                            width: i === idx ? 24 : 6,
                            background: i === idx ? "#fff" : "rgba(255,255,255,0.4)",
                        }}
                    />
                ))}
            </div>
        </section>
    );
}
