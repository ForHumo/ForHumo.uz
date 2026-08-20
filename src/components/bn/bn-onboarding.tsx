"use client";

// BNda birinchi kirish uchun 4-qadamli welcome modal (localStorage bir marta).
// Layout ichida mount qilinadi; ilk marta ochilganda ko'rinadi.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    ShoppingBag, Truck, Shield, Sparkles, ChevronRight, X,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";

const KEY = "bn-onboarding-v1";

interface StepMeta {
    icon: typeof ShoppingBag;
    color: string;
    titleKey: string;
    textKey: string;
}

const STEP_META: StepMeta[] = [
    { icon: Sparkles,   color: "#fbbf24", titleKey: "s1Title", textKey: "s1Text" },
    { icon: ShoppingBag, color: "#60a5fa", titleKey: "s2Title", textKey: "s2Text" },
    { icon: Truck,      color: "#34d399", titleKey: "s3Title", textKey: "s3Text" },
    { icon: Shield,     color: "#a78bfa", titleKey: "s4Title", textKey: "s4Text" },
];

export function BnOnboarding() {
    const t = useTranslations("bn.onboarding");
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        try {
            const seen = localStorage.getItem(KEY);
            if (!seen) {
                // 800ms kechikish — sahifa yuklanib bo'lgach
                const t = setTimeout(() => setOpen(true), 800);
                return () => clearTimeout(t);
            }
        } catch {}
    }, []);

    const close = () => {
        try { localStorage.setItem(KEY, "1"); } catch {}
        setOpen(false);
    };

    const next = () => {
        if (step < STEP_META.length - 1) setStep(s => s + 1);
        else close();
    };

    const current = STEP_META[step];
    const Icon = current.icon;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={close}
                >
                    <motion.div
                        className="w-full max-w-[420px] rounded-3xl overflow-hidden relative"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        initial={{ y: 40, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 40, opacity: 0, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Yopish */}
                        <button
                            onClick={close}
                            className="absolute top-3 right-3 w-9 h-9 rounded-full grid place-items-center z-10 transition-colors hover:bg-white/10"
                            style={{ color: BN.text3 }}
                            aria-label={t("close")}
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Kontent */}
                        <div className="px-7 pt-10 pb-6 text-center">
                            <motion.div
                                key={step}
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 340, damping: 24 }}
                                className="w-16 h-16 rounded-3xl mx-auto mb-4 grid place-items-center"
                                style={{ background: `${current.color}22`, color: current.color }}
                            >
                                <Icon className="w-7 h-7" />
                            </motion.div>
                            <motion.h3
                                key={`t-${step}`}
                                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                className="text-[20px] font-black tracking-tight mb-2"
                            >
                                {t(current.titleKey)}
                            </motion.h3>
                            <motion.p
                                key={`p-${step}`}
                                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.05 }}
                                className="text-[14px] leading-relaxed"
                                style={{ color: BN.text2 }}
                            >
                                {t(current.textKey)}
                            </motion.p>
                        </div>

                        {/* Nuqtalar */}
                        <div className="flex items-center justify-center gap-1.5 pb-4">
                            {STEP_META.map((_, i) => (
                                <span
                                    key={i}
                                    className="rounded-full transition-all"
                                    style={{
                                        width: i === step ? 20 : 6,
                                        height: 6,
                                        background: i === step ? "#60a5fa" : "rgba(255,255,255,0.2)",
                                    }}
                                />
                            ))}
                        </div>

                        {/* Tugmalar */}
                        <div className="px-5 pb-5 flex items-center gap-2">
                            <button
                                onClick={close}
                                className="flex-1 rounded-2xl py-3 text-[14px] font-semibold transition-colors hover:bg-white/5"
                                style={{ color: BN.text3 }}
                            >
                                {t("skip")}
                            </button>
                            <button
                                onClick={next}
                                className="flex-1 rounded-2xl py-3 text-[14px] font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
                                style={{ background: "#60a5fa", color: "#000" }}
                            >
                                {step < STEP_META.length - 1 ? t("next") : t("start")}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
