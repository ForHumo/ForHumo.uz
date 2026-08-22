"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
    Home as HomeIcon, Truck, CalendarClock, Sparkles,
    ArrowRight, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT, BELIS_SOCIAL } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";
import { BelisProductCard, type BelisProductLite } from "./belis-product-card";

export function BelisHome() {
    const t = useTranslations("belis");

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
            {/* AD Banner */}
            <BelisAdBanner />

            {/* 2×2 tez amal kartalari */}
            <QuickActions />

            {/* Featured mahsulotlar */}
            <FeaturedProducts />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// AD Banner — carousel/slider (auto-slide + manual navigation)
// Slaydlar hozircha mahalliy — kelajakda API'dan yuklanadi
// ─────────────────────────────────────────────────────────────────────────────

interface Slide {
    id: string; title: string; subtitle: string; cta: string; ctaHref: string;
    gradient: string; icon: React.ReactNode;
}

const AD_SLIDES: Slide[] = [
    {
        id: "new-collection",
        title: "Yangi kolleksiya",
        subtitle: "Sarpo qutilari va sovg'a to'plamlari",
        cta: "Katalogni ko'rish",
        ctaHref: "/belis/katalog",
        gradient: "linear-gradient(135deg, #C7CDB2 0%, #A6AE8A 100%)",
        icon: <Sparkles className="w-16 h-16 md:w-24 md:h-24" strokeWidth={0.75} />,
    },
    {
        id: "welcome",
        title: "Belis",
        subtitle: "Siz uchun, mehr bilan…",
        cta: "Katalog",
        ctaHref: "/belis/katalog",
        gradient: "linear-gradient(135deg, #E7EBD7 0%, #D4AF37 120%)",
        icon: null,
    },
    {
        id: "telegram",
        title: "Telegram bot'da tez",
        subtitle: "@belisuz_bot — bir bosishda buyurtma",
        cta: "Botda ochish",
        ctaHref: BELIS_SOCIAL.telegramBot,
        gradient: "linear-gradient(135deg, #A6AE8A 0%, #8E9673 100%)",
        icon: <Truck className="w-16 h-16 md:w-24 md:h-24" strokeWidth={0.75} />,
    },
];

function BelisAdBanner() {
    const [idx, setIdx] = useState(0);
    // Auto-slide har 6s
    useEffect(() => {
        const iv = setInterval(() => setIdx(i => (i + 1) % AD_SLIDES.length), 6_000);
        return () => clearInterval(iv);
    }, []);
    const slide = AD_SLIDES[idx];
    const isExternal = slide.ctaHref.startsWith("http");

    return (
        <section className="relative rounded-3xl overflow-hidden"
            style={{ boxShadow: "0 12px 32px rgba(58,53,32,0.15)" }}>
            <div className="relative min-h-[240px] md:min-h-[300px] flex items-center px-6 md:px-10 py-8 transition-all duration-500"
                style={{ background: slide.gradient }}>
                {/* Content */}
                <div className="relative z-10 flex-1 max-w-xl">
                    <h2 style={{
                        fontFamily: "'Great Vibes', 'Playfair Display', cursive",
                        fontSize: "clamp(36px, 6vw, 64px)",
                        color: slide.id === "welcome" ? BELIS.gold : "#FFFFFF",
                        lineHeight: 1,
                        margin: 0,
                        textShadow: slide.id === "welcome" ? "0 2px 8px rgba(58,53,32,0.15)" : "0 2px 12px rgba(58,53,32,0.30)",
                    }}>
                        {slide.title}
                    </h2>
                    <p className="mt-2 md:mt-3 text-base md:text-lg italic"
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            color: slide.id === "welcome" ? BELIS.text : "rgba(255,255,255,0.95)",
                            textShadow: slide.id !== "welcome" ? "0 1px 6px rgba(58,53,32,0.30)" : undefined,
                        }}>
                        {slide.subtitle}
                    </p>
                    {isExternal ? (
                        <a href={slide.ctaHref} target="_blank" rel="noopener"
                            className="inline-flex items-center gap-2 mt-4 md:mt-6 px-5 py-2.5 rounded-full text-sm font-black transition hover:brightness-110"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif", boxShadow: "0 4px 16px rgba(212,175,55,0.35)" }}>
                            {slide.cta} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </a>
                    ) : (
                        <BelisLink href={slide.ctaHref}
                            className="inline-flex items-center gap-2 mt-4 md:mt-6 px-5 py-2.5 rounded-full text-sm font-black transition hover:brightness-110"
                            style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif", boxShadow: "0 4px 16px rgba(212,175,55,0.35)" }}>
                            {slide.cta} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </BelisLink>
                    )}
                </div>
                {/* Dekor icon */}
                {slide.icon && (
                    <div className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 opacity-25"
                        style={{ color: "#FFFFFF" }}>
                        {slide.icon}
                    </div>
                )}
                {/* Dekor doiralar */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full opacity-10 pointer-events-none"
                    style={{ background: "white" }} />
                <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full opacity-5 pointer-events-none"
                    style={{ background: "white" }} />
            </div>

            {/* Nav strelkalar */}
            <button onClick={() => setIdx((idx - 1 + AD_SLIDES.length) % AD_SLIDES.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hidden md:flex items-center justify-center transition hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(6px)" }}>
                <ChevronLeft className="w-4 h-4" strokeWidth={2} style={{ color: BELIS.text }} />
            </button>
            <button onClick={() => setIdx((idx + 1) % AD_SLIDES.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hidden md:flex items-center justify-center transition hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(6px)" }}>
                <ChevronRight className="w-4 h-4" strokeWidth={2} style={{ color: BELIS.text }} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {AD_SLIDES.map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)}
                        className="rounded-full transition-all"
                        style={{
                            width: i === idx ? 20 : 6, height: 6,
                            background: i === idx ? BELIS.gold : "rgba(255,255,255,0.65)",
                        }} />
                ))}
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2×2 tez amal kartalari
// ─────────────────────────────────────────────────────────────────────────────
function QuickActions() {
    const router = useRouter();
    const CARDS = [
        {
            id: "pickup",
            title: "O'zi olib ketish",
            subtitle: "Belis'ga kelib olish · Bepul",
            icon: HomeIcon,
            gradient: "linear-gradient(135deg, #C7CDB2 0%, #8E9673 100%)",
            onClick: () => { try { localStorage.setItem("belis:pref-fulfill", "PICKUP"); } catch {} router.push("/belis/katalog" as never); },
        },
        {
            id: "delivery",
            title: "Yetkazib berish",
            subtitle: "Yandex · BTS Express",
            icon: Truck,
            gradient: "linear-gradient(135deg, #E7EBD7 0%, #A6AE8A 100%)",
            onClick: () => { try { localStorage.setItem("belis:pref-fulfill", "YANDEX_DELIVERY"); } catch {} router.push("/belis/katalog" as never); },
        },
        {
            id: "preorder",
            title: "Oldindan buyurtma",
            subtitle: "Kelasi hafta tayyor bo'lguncha",
            icon: CalendarClock,
            gradient: "linear-gradient(135deg, #C7CDB2 0%, #EBD79A 100%)",
            onClick: () => router.push("/belis/katalog?preorder=1" as never),
        },
        {
            id: "ai",
            title: "Humo AI bilan tezkor harid",
            subtitle: "Aytib bering — biz topamiz",
            icon: Sparkles,
            gradient: BELIS_GOLD_GRADIENT,
            onClick: () => router.push("/belis/ai" as never),
        },
    ];

    return (
        <section>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                {CARDS.map(c => {
                    const Icon = c.icon;
                    const isGold = c.id === "ai";
                    const textColor = isGold ? BELIS.onGold : "#FFFFFF";
                    return (
                        <button key={c.id} onClick={c.onClick}
                            className="relative rounded-2xl md:rounded-3xl overflow-hidden text-left transition hover:brightness-110 active:scale-[0.98] group"
                            style={{
                                background: c.gradient,
                                minHeight: 130,
                                boxShadow: "0 6px 20px rgba(58,53,32,0.12)",
                            }}>
                            <div className="p-4 md:p-5 flex flex-col h-full relative z-10">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-2 md:mb-3"
                                    style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(6px)" }}>
                                    <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} style={{ color: textColor }} />
                                </div>
                                <p className="text-sm md:text-base font-black leading-tight"
                                    style={{ color: textColor, fontFamily: "'Playfair Display', serif", textShadow: !isGold ? "0 1px 4px rgba(58,53,32,0.25)" : undefined }}>
                                    {c.title}
                                </p>
                                <p className="text-[10px] md:text-xs mt-1 opacity-90"
                                    style={{ color: textColor, fontFamily: "'Montserrat', sans-serif" }}>
                                    {c.subtitle}
                                </p>
                            </div>
                            {/* Dekor doira */}
                            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-15 pointer-events-none"
                                style={{ background: "white" }} />
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Featured mahsulotlar
// ─────────────────────────────────────────────────────────────────────────────
function FeaturedProducts() {
    const t = useTranslations("belis.sections");
    const [items, setItems] = useState<BelisProductLite[] | null>(null);

    useEffect(() => {
        fetch("/api/belis/products?featured=1&limit=12").then(r => r.ok ? r.json() : null)
            .then(d => setItems(d?.items ?? []));
    }, []);

    if (items === null) {
        return (
            <section>
                <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: BELIS.gold }} />
                </div>
            </section>
        );
    }
    if (items.length === 0) {
        return (
            <section>
                <SectionHeading>{t("featured")}</SectionHeading>
                <div className="mt-4 py-10 text-center rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px dashed ${BELIS.border}` }}>
                    <p className="text-sm italic" style={{ color: BELIS.text2 }}>
                        Tez orada — birinchi to&apos;plamlar tayyorlanmoqda
                    </p>
                    <BelisLink href="/belis/katalog"
                        className="inline-flex items-center gap-1.5 text-xs font-bold mt-3 hover:underline"
                        style={{ color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>
                        Katalogni ochish <ArrowRight className="w-3 h-3" strokeWidth={2} />
                    </BelisLink>
                </div>
            </section>
        );
    }
    return (
        <section>
            <SectionHeading>{t("featured")}</SectionHeading>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {items.map(p => <BelisProductCard key={p.id} product={p} />)}
            </div>
        </section>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4">
            <span className="flex-1 h-px" style={{ background: BELIS.borderSoft }} />
            <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 24,
                color: BELIS.gold,
                letterSpacing: "0.02em",
                margin: 0,
            }}>
                {children}
            </h2>
            <span className="flex-1 h-px" style={{ background: BELIS.borderSoft }} />
        </div>
    );
}
