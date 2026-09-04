"use client";

// BN welcome tour (M1) — birinchi tashrifda foydalanuvchiga BN nima ekanini
// tushuntiruvchi 3-slaydli intro. localStorage bilan bir marta ko'rsatiladi.

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    X, ChevronRight, ChevronLeft, TrendingDown, Eye, Truck, CheckCircle2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

const LS_KEY = "bn-welcome-tour-seen-v1";

interface Slide {
    icon: React.ReactNode;
    titleKey: string;
    bodyKey: string;
    highlightKey?: string;
}

const SLIDES: Slide[] = [
    {
        icon: <TrendingDown className="w-8 h-8" />,
        titleKey: "s1Title",
        bodyKey: "s1Body",
        highlightKey: "s1Highlight",
    },
    {
        icon: <Eye className="w-8 h-8" />,
        titleKey: "s2Title",
        bodyKey: "s2Body",
        highlightKey: "s2Highlight",
    },
    {
        icon: <Truck className="w-8 h-8" />,
        titleKey: "s3Title",
        bodyKey: "s3Body",
        highlightKey: "s3Highlight",
    },
];

export function BnWelcomeTour() {
    const t = useTranslations("bn.tour");
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const seen = localStorage.getItem(LS_KEY) === "1";
            if (!seen) {
                // 1.2 soniya kutamiz — sahifa yuklansin
                const id = setTimeout(() => setOpen(true), 1200);
                return () => clearTimeout(id);
            }
        } catch { /* noop */ }
    }, []);

    function dismiss() {
        try { localStorage.setItem(LS_KEY, "1"); } catch { /* noop */ }
        setOpen(false);
    }

    function next() {
        if (step < SLIDES.length - 1) setStep(s => s + 1);
        else dismiss();
    }

    if (!mounted || !open) return null;

    const slide = SLIDES[step];
    const isLast = step === SLIDES.length - 1;

    const content = (
        <div
            className="bn-scope fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-2 sm:p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={dismiss}
        >
            <div
                className="w-full max-w-md rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top bar with progress + skip */}
                <div className="flex items-center gap-2 p-4">
                    <div className="flex-1 flex items-center gap-1.5">
                        {SLIDES.map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 h-1 rounded-full transition-colors"
                                style={{ background: i <= step ? BN.gold : `${BN.text3}22` }}
                            />
                        ))}
                    </div>
                    <button
                        onClick={dismiss}
                        className="text-[12px] font-bold p-1"
                        style={{ color: BN.text3 }}
                        aria-label={t("skip")}
                    >
                        {t("skip")}
                    </button>
                </div>

                {/* Slide content */}
                <div className="px-6 pb-6 text-center">
                    <span
                        className="w-20 h-20 rounded-3xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        {slide.icon}
                    </span>

                    <h2 className="text-[22px] font-black mb-3 tracking-tight leading-tight">
                        {t(slide.titleKey)}
                    </h2>

                    <p className="text-[14px] leading-relaxed mb-4" style={{ color: BN.text2 }}>
                        {t(slide.bodyKey)}
                    </p>

                    {slide.highlightKey && (
                        <div
                            className="p-3.5 rounded-2xl mx-auto mb-2 inline-flex items-center gap-2 text-[13px] font-black"
                            style={{ background: BN.goldSoft, color: BN.gold }}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {t(slide.highlightKey)}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 flex items-center gap-2" style={{ borderTop: `1px solid ${BN.border}` }}>
                    {step > 0 && (
                        <button
                            onClick={() => setStep(s => Math.max(0, s - 1))}
                            className="h-12 px-4 rounded-xl text-[13px] font-black flex items-center gap-1"
                            style={{ background: BN.surfaceUp, color: BN.text }}
                        >
                            <ChevronLeft className="w-4 h-4" /> {t("back")}
                        </button>
                    )}
                    <button
                        onClick={next}
                        className="flex-1 h-12 rounded-xl text-[14px] font-black flex items-center justify-center gap-1.5"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {isLast ? t("startBtn") : t("nextBtn")}
                        {!isLast && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>

                {/* Last slide extra: link to catalog */}
                {isLast && (
                    <div className="px-4 pb-4">
                        <BnLink
                            href="/qidiruv"
                            onClick={dismiss}
                            className="block w-full h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-1"
                            style={{ background: BN.surfaceUp, color: BN.text2 }}
                        >
                            {t("browseBtn")} <ChevronRight className="w-4 h-4" />
                        </BnLink>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
