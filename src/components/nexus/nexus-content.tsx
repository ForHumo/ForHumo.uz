"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { 
    Play, 
    MessageSquare, 
    Users, 
    Zap, 
    Shield, 
    Sparkles, 
    Trophy, 
    Tv,
    ArrowRight
} from "lucide-react";
import { HeroSection } from "./hero-section";
import { FeaturesGrid } from "./features-grid";
import { MessengerPreview } from "./messenger-preview";
import { WatchTogetherDemo } from "./watch-together-demo";

export function NexusContent() {
    const t = useTranslations("Nexus");

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 selection:text-primary">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
            </div>

            {/* Hero Section */}
            <HeroSection />

            {/* Features Grid */}
            <section className="relative z-10 py-24 px-4 container mx-auto">
                <div className="text-center mb-16">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50"
                    >
                        {t("features.streaming_title")} & More
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-400 max-w-2xl mx-auto"
                    >
                        {t("hero_desc")}
                    </motion.p>
                </div>
                <FeaturesGrid />
            </section>

            {/* Messenger Preview Section */}
            <MessengerPreview />

            {/* Watch Together Section */}
            <WatchTogetherDemo />

            {/* Final CTA */}
            <section className="relative z-10 py-32 px-4 container mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-b from-white/10 to-transparent p-12 rounded-[3rem] border border-white/10 backdrop-blur-xl"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-8">
                        Ready to join the <span className="text-primary">Future</span>?
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button className="px-12 py-5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(var(--primary-rgb),0.4)] flex items-center gap-3 text-lg">
                            {t("cta_join")}
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* Footer Padding */}
            <div className="h-24" />
        </div>
    );
}
