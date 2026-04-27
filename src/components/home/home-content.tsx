"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
    Gamepad2,
    Brain,
    Server,
    Headset
} from "lucide-react";
import { ProjectCard } from "@/components/ui/project-card";

const iconMap = {
    Gamepad2, Brain, Server, Headset
};

export function HomeContent() {
    const tHero = useTranslations("Hero");
    const tProjects = useTranslations("Projects");

    const projectsData = [
        {
            title: "Humo Nexus",
            description: tProjects("nexus_desc"),
            href: "/nexus",
            iconName: "Server",
            status: "active" as const,
        },
        {
            title: "Humo AI",
            description: tProjects("ai_desc"),
            href: "/ai",
            iconName: "Brain",
            status: "active" as const,
        },
        {
            title: "Humo eSport",
            description: tProjects("esport_desc"),
            href: "/esport",
            iconName: "Gamepad2",
            status: "active" as const,
        },
        {
            title: "Humo Support",
            description: tProjects("support_desc"),
            href: "/support",
            iconName: "Headset",
            status: "active" as const,
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-background relative selection:bg-primary/30">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen animate-pulse delay-1000" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-50" />
            </div>

            {/* Hero Section */}
            <section className="relative flex flex-col items-center justify-center min-h-[80vh] py-20 overflow-hidden z-10">
                <div className="container px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 1, type: "spring", bounce: 0.4 }}
                        className="relative mx-auto h-40 w-40 mb-10 group cursor-pointer"
                    >
                        {/* Floating & Glowing Logo */}
                        <motion.div 
                            animate={{ y: [-10, 10, -10] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="relative w-full h-full"
                        >
                            <div className="absolute inset-0 rounded-full bg-primary/30 blur-3xl group-hover:bg-primary/50 transition-colors duration-500" />
                            <Image
                                src="/logo.png"
                                alt="For Humo Logo"
                                fill
                                className="object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] group-hover:scale-105 transition-transform duration-500"
                                priority
                            />
                        </motion.div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground drop-shadow-sm"
                    >
                        {tHero("title_prefix")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">{tHero("title_suffix")}</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="text-lg md:text-2xl text-muted-foreground/80 max-w-3xl mx-auto mb-12 font-medium"
                    >
                        {tHero("description")}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                    >
                        <a
                            href="#ecosystem"
                            className="group relative inline-flex h-14 items-center justify-center rounded-full bg-primary/10 px-10 font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground border border-primary/30 hover:border-primary overflow-hidden shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)]"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {tHero("explore")}
                                <motion.span
                                    animate={{ y: [0, 5, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    ↓
                                </motion.span>
                            </span>
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* Ecosystem Grid */}
            <section id="ecosystem" className="py-32 relative z-10">
                <div className="container px-4 mx-auto max-w-5xl">
                    <div className="text-center mb-20">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="text-4xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60"
                        >
                            {tProjects("title")}
                        </motion.h2>
                        <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {projectsData.map((project, index) => {
                            const IconComponent = iconMap[project.iconName as keyof typeof iconMap] || Gamepad2;
                            return (
                                <ProjectCard
                                    key={project.title}
                                    {...project}
                                    icon={IconComponent}
                                    index={index}
                                />
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
