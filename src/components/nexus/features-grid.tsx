"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { 
    Tv, 
    Users, 
    MessageCircle, 
    Zap, 
    Sparkles, 
    Trophy,
    Shield,
    Globe
} from "lucide-react";

export function FeaturesGrid() {
    const t = useTranslations("Nexus");

    const features = [
        {
            icon: <Tv className="w-8 h-8 text-red-500" />,
            title: t("features.streaming_title"),
            desc: t("features.streaming_desc"),
            color: "rgba(239, 68, 68, 0.1)"
        },
        {
            icon: <Users className="w-8 h-8 text-blue-500" />,
            title: t("features.social_title"),
            desc: t("features.social_desc"),
            color: "rgba(59, 130, 246, 0.1)"
        },
        {
            icon: <MessageCircle className="w-8 h-8 text-green-500" />,
            title: t("features.messenger_title"),
            desc: t("features.messenger_desc"),
            color: "rgba(34, 197, 94, 0.1)"
        },
        {
            icon: <Zap className="w-8 h-8 text-yellow-500" />,
            title: t("features.watch_together_title"),
            desc: t("features.watch_together_desc"),
            color: "rgba(234, 179, 8, 0.1)"
        },
        {
            icon: <Sparkles className="w-8 h-8 text-purple-500" />,
            title: t("features.ai_title"),
            desc: t("features.ai_desc"),
            color: "rgba(168, 85, 247, 0.1)"
        },
        {
            icon: <Trophy className="w-8 h-8 text-orange-500" />,
            title: t("features.gamification_title"),
            desc: t("features.gamification_desc"),
            color: "rgba(249, 115, 22, 0.1)"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="relative group p-8 bg-white/[0.03] border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-sm"
                >
                    <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ 
                            background: `radial-gradient(circle at center, ${feature.color} 0%, transparent 70%)` 
                        }}
                    />
                    
                    <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 group-hover:border-white/20 transition-all duration-300">
                            {feature.icon}
                        </div>
                        <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                        <p className="text-gray-400 leading-relaxed">
                            {feature.desc}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
