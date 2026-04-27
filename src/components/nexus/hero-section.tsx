"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Play, ArrowRight } from "lucide-react";

export function HeroSection() {
    const t = useTranslations("Nexus");

    return (
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#050505]/80 to-[#050505] z-10" />
                <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-full object-cover scale-110 blur-sm brightness-[0.4]"
                >
                    <source src="https://assets.mixkit.co/videos/preview/mixkit-stars-in-the-night-sky-moving-slowly-31238-large.mp4" type="video/mp4" />
                </video>
            </div>

            <div className="relative z-20 container mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-block px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-bold tracking-widest uppercase mb-6 backdrop-blur-md"
                    >
                        Humo Nexus • Ecosystem
                    </motion.div>
                    
                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                        {t("hero_title")}
                    </h1>
                    
                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                        {t("hero_desc")}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button className="group relative px-10 py-5 bg-white text-black font-black rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden">
                            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                            <Play className="w-6 h-6 fill-current" />
                            {t("cta_watch")}
                        </button>
                        
                        <button className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 backdrop-blur-xl">
                            {t("cta_join")}
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-30"
            >
                <div className="w-1 h-12 bg-gradient-to-b from-white to-transparent rounded-full" />
            </motion.div>
        </section>
    );
}
