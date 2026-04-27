"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Play, Users, Heart, Share2, Maximize2, Volume2 } from "lucide-react";

export function WatchTogetherDemo() {
    const t = useTranslations("Nexus");

    return (
        <section className="py-24 bg-gradient-to-b from-transparent to-primary/5">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                    {/* Content */}
                    <div className="flex-1 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
                                {t("features.watch_together_title")}
                            </h2 >
                            <p className="text-xl text-gray-400 leading-relaxed max-w-xl">
                                {t("features.watch_together_desc")} Experience cinema with your friends, no matter where they are. Sync playback, live chat, and shared reactions.
                            </p>
                        </motion.div>

                        <div className="space-y-6">
                            {[
                                { icon: <Users className="text-blue-500" />, text: "Up to 50 friends in one room" },
                                { icon: <Heart className="text-red-500" />, text: "Live reactions & emojis" },
                                { icon: <Share2 className="text-green-500" />, text: "Easy invite via Humo Messenger" }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-4 text-lg"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                        {item.icon}
                                    </div>
                                    <span className="text-gray-300 font-medium">{item.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Player Mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 w-full"
                    >
                        <div className="relative group aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(var(--primary-rgb),0.1)]">
                            {/* Background Image (Movie Placeholder) */}
                            <img 
                                src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=2070" 
                                alt="Movie Preview"
                                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                            />

                            {/* Floating Chat/Users Overlay */}
                            <div className="absolute top-6 right-6 flex flex-col gap-3">
                                {[1, 2, 3].map((u) => (
                                    <motion.div
                                        key={u}
                                        initial={{ x: 20, opacity: 0 }}
                                        whileInView={{ x: 0, opacity: 1 }}
                                        transition={{ delay: u * 0.2 }}
                                        className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-2 pr-4 rounded-full border border-white/10"
                                    >
                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${u === 1 ? 'from-primary to-orange-500' : u === 2 ? 'from-blue-500 to-purple-500' : 'from-green-500 to-teal-500'}`} />
                                        <div className="text-[10px] font-bold">User {u}</div>
                                        <motion.div 
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ repeat: Infinity, duration: 1, delay: u * 0.5 }}
                                            className="text-xs"
                                        >
                                            {u === 1 ? '🎬' : u === 2 ? '🔥' : '🍿'}
                                        </motion.div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Player Controls */}
                            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black to-transparent flex items-end justify-between px-8 pb-6 translate-y-4 group-hover:translate-y-0 transition-transform">
                                <div className="flex items-center gap-6">
                                    <Play size={24} className="fill-current" />
                                    <Volume2 size={24} />
                                    <div className="text-sm font-medium">01:45:20 / 02:30:15</div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <Users size={20} className="text-primary" />
                                    <Maximize2 size={24} />
                                </div>
                            </div>
                            
                            {/* Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 flex items-center justify-center cursor-pointer"
                                >
                                    <Play size={32} className="text-white fill-current translate-x-1" />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
