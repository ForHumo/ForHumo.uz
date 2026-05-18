"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const features = [
    { key: "chat" },
    { key: "image" },
    { key: "music" },
    { key: "video" },
    { key: "multimodal" },
    { key: "memory" },
];

export function AIContent() {
    const t = useTranslations("AI");

    return (
        <div className="w-full max-w-4xl mx-auto px-4">
            {/* Hero text */}
            <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
                {t("hero_title")}
            </h1>
            <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
                {t("hero_desc")}
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-20">
                <Link
                    href="/ai/chat"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black font-semibold px-6 py-3 text-sm transition hover:bg-white/90"
                >
                    {t("cta_open")}
                </Link>
                <a
                    href="https://forhumo.uz"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 text-white/70 font-medium px-6 py-3 text-sm transition hover:border-white/30 hover:text-white"
                >
                    {t("cta_learn")}
                </a>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-24">
                {features.map((f, i) => (
                    <motion.div
                        key={f.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 * i }}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 text-left"
                    >
                        <p className="text-white font-semibold mb-1 text-sm">
                            {t(`features.${f.key}_title`)}
                        </p>
                        <p className="text-white/50 text-xs leading-relaxed">
                            {t(`features.${f.key}_desc`)}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}