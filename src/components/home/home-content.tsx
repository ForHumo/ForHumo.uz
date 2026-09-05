"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import {
    Gamepad2,
    Brain,
    Server,
    Headset,
    Fingerprint,
    ShoppingBag,
    CreditCard,
    Store,
    LayoutDashboard,
} from "lucide-react";
import { ProjectCard } from "@/components/ui/project-card";
import { LiveBackground } from "@/components/home/live-background";

export function HomeContent() {
    const tHero = useTranslations("Hero");
    const tProjects = useTranslations("Projects");
    const { status } = useSession();

    const projectsData: {
        title: string;
        description: string;
        href: string;
        icon: React.ComponentType<{ size?: number; className?: string }>;
        logoSrc: string;
        logoSrcDark?: string;
        status: "active" | "coming-soon";
    }[] = [
        {
            title: "Humo ID",
            description: tProjects("id_desc"),
            href: "/id",
            icon: Fingerprint,
            logoSrc: "/logos/humo-id.png",
            status: "active",
        },
        {
            title: "Humo AI",
            description: tProjects("ai_desc"),
            href: "/ai",
            icon: Brain,
            logoSrc: "/logos/humo-ai-black.png",
            logoSrcDark: "/logos/humo-ai-white.png",
            status: "active",
        },
        {
            title: "Humo Nexus",
            description: tProjects("nexus_desc"),
            href: "/nexus",
            icon: Server,
            logoSrc: "/logos/humo-nexus.png",
            status: "active",
        },
        {
            title: "Humo eSport",
            description: tProjects("esport_desc"),
            href: "/esport",
            icon: Gamepad2,
            logoSrc: "/logos/humo-esport.png",
            status: "active",
        },
        {
            title: "Humo Market",
            description: tProjects("market_desc"),
            href: "/market",
            icon: ShoppingBag,
            logoSrc: "/logos/humo-market.png",
            status: "active",
        },
        {
            title: "For Pay",
            description: tProjects("pay_desc"),
            href: "/pay",
            icon: CreditCard,
            logoSrc: "/logos/for-pay.png",
            status: "active",
        },
        {
            // Foydalanuvchi so'rovi: For Pay kartasidan keyin BN kartasi.
            // Havola ichki — forhumo.uz/{locale}/bn (locale Link avtomatik qo'shadi).
            title: "Bozor Narxida",
            description: tProjects("bn_desc"),
            href: "/bn",
            icon: Store,
            logoSrc: "/bn/logo.png",
            logoSrcDark: "/bn/logo-dark.png",
            status: "active",
        },
        {
            title: "Humo Support",
            description: tProjects("support_desc"),
            href: "/support",
            icon: Headset,
            logoSrc: "/logos/humo-support.png",
            status: "active",
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-background relative selection:bg-primary/20">

            {/* Jonli fon — yulduz turkumi + aurora */}
            <LiveBackground />

            {/* Hero Section */}
            <section className="relative flex flex-col items-center justify-center min-h-[82vh] py-20 overflow-hidden z-10">
                <div className="container px-4 text-center">

                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.9, type: "spring", bounce: 0.4 }}
                        className="relative mx-auto h-36 w-36 mb-10 group cursor-pointer"
                    >
                        <motion.div
                            animate={{ y: [-8, 8, -8] }}
                            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                            className="relative w-full h-full"
                        >
                            {/* Glow ring - adapts to theme */}
                            <div className="absolute inset-0 rounded-full
                                bg-blue-500/25 dark:bg-primary/30
                                blur-3xl
                                group-hover:bg-blue-500/40 dark:group-hover:bg-primary/50
                                transition-colors duration-500"
                            />
                            <Image
                                src="/logo.png"
                                alt="For Humo Logo"
                                fill
                                className="object-contain
                                    drop-shadow-[0_0_24px_rgba(0,136,255,0.7)]
                                    group-hover:scale-105
                                    transition-transform duration-500"
                                priority
                            />
                        </motion.div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6
                            text-transparent bg-clip-text
                            bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground
                            drop-shadow-sm"
                    >
                        {tHero("title_prefix")}
                    </motion.h1>

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 font-medium leading-relaxed"
                    >
                        {tHero("description")}
                    </motion.p>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                    >
                        <a
                            href="#project"
                            className="group relative inline-flex h-13 items-center justify-center rounded-full
                                bg-blue-500/10 dark:bg-primary/10
                                px-9 font-bold
                                text-blue-600 dark:text-primary
                                transition-all
                                hover:bg-blue-500 dark:hover:bg-primary
                                hover:text-white
                                border border-blue-500/30 dark:border-primary/30
                                hover:border-blue-500 dark:hover:border-primary
                                shadow-[0_0_32px_-10px_rgba(0,136,255,0.35)]
                                hover:shadow-[0_0_40px_-8px_rgba(0,136,255,0.55)]"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {tHero("explore")}
                                <motion.span
                                    animate={{ y: [0, 4, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    ↓
                                </motion.span>
                            </span>
                        </a>

                        {status === "authenticated" && (
                            <Link href={"/humo" as never}
                                className="group relative inline-flex h-13 items-center justify-center rounded-full
                                    px-9 font-bold
                                    bg-gradient-to-r from-blue-500 to-purple-600
                                    text-white
                                    transition-all hover:shadow-[0_0_40px_-8px_rgba(99,102,241,0.6)]
                                    border border-white/20">
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Mening panelim
                            </Link>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* Projects Grid */}
            <section id="project" className="py-24 relative z-10 scroll-mt-16">
                <div className="container px-4 mx-auto max-w-6xl">

                    {/* Section header */}
                    <div className="text-center mb-16">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="text-4xl md:text-5xl font-bold mb-5
                                text-foreground"
                        >
                            {tProjects("title")}
                        </motion.h2>
                        <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto rounded-full
                            shadow-[0_0_16px_rgba(0,136,255,0.5)]"
                        />
                    </div>

                    {/* Loyihalar gridi — barcha kartalar bir xil tartibda (BN dan keyin Support) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projectsData.map((project, index) => (
                            <ProjectCard
                                key={project.title}
                                title={project.title}
                                description={project.description}
                                href={project.href}
                                icon={project.icon as React.ComponentType<{ size?: number; className?: string }>}
                                logoSrc={project.logoSrc}
                                logoSrcDark={project.logoSrcDark}
                                status={project.status}
                                index={index}
                            />
                        ))}
                    </div>

                </div>
            </section>
        </div>
    );
}
