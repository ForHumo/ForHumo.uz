"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Send, Phone, Video, MoreVertical, Paperclip, Smile } from "lucide-react";

export function MessengerPreview() {
    const t = useTranslations("Nexus");

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Content */}
                    <div className="flex-1 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
                                {t("features.messenger_title")}
                            </h2>
                            <p className="text-xl text-gray-400 leading-relaxed max-w-xl">
                                {t("features.messenger_desc")} Connect with your community through secure chats, channels, and groups. High-speed, intuitive, and always with you.
                            </p>
                        </motion.div>

                        <div className="flex flex-wrap gap-4">
                            {["End-to-End Encrypted", "Channels", "Groups", "File Sharing"].map((feature, i) => (
                                <motion.div
                                    key={feature}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-gray-300"
                                >
                                    {feature}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Chat Mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex-1 w-full max-w-2xl"
                    >
                        <div className="relative aspect-[4/3] bg-[#0F0F0F] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                            {/* Chat Header */}
                            <div className="absolute top-0 inset-x-0 h-16 bg-white/[0.03] border-b border-white/10 flex items-center justify-between px-6 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-500" />
                                    <div>
                                        <div className="text-sm font-bold">Humo Nexus Community</div>
                                        <div className="text-[10px] text-green-500 font-bold">12,450 online</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-gray-400">
                                    <Phone size={18} />
                                    <Video size={18} />
                                    <MoreVertical size={18} />
                                </div>
                            </div>

                            {/* Chat Content (Static Visual) */}
                            <div className="pt-20 pb-20 px-6 space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20" />
                                    <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none max-w-[70%]">
                                        <p className="text-sm">Guys, did you see the new movie trailer on Nexus? 🔥</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-primary/20" />
                                    <div className="bg-primary/20 p-4 rounded-2xl rounded-tr-none max-w-[70%]">
                                        <p className="text-sm text-primary-foreground">Yes! The CGI is insane. Let's Watch Together tonight! 🍿</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20" />
                                    <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none max-w-[70%]">
                                        <p className="text-sm">Count me in! What time? 🤝</p>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Input */}
                            <div className="absolute bottom-0 inset-x-0 h-20 bg-white/[0.03] border-t border-white/10 flex items-center gap-4 px-6 backdrop-blur-md">
                                <Paperclip size={20} className="text-gray-500" />
                                <div className="flex-1 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center px-4 text-sm text-gray-500">
                                    Type a message...
                                </div>
                                <Smile size={20} className="text-gray-500" />
                                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                                    <Send size={20} className="text-white" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
