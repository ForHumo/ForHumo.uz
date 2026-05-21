"use client";

import React, { MouseEvent } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface ProjectCardProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
    logoSrc?: string;
    logoSrcDark?: string;
    status: "active" | "coming-soon";
    index?: number;
    className?: string;
}

export function ProjectCard({ title, description, href, icon: Icon, logoSrc, logoSrcDark, status, index = 0, className }: ProjectCardProps) {
    const t = useTranslations("Status");
    const tCommon = useTranslations("Common");

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.08, type: "spring", stiffness: 100 }}
            className={cn("h-full group relative", className)}
            onMouseMove={handleMouseMove}
        >
            <Link href={href} className="block relative h-full">
                {/* Hover spotlight */}
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                        background: useMotionTemplate`
                            radial-gradient(
                                500px circle at ${mouseX}px ${mouseY}px,
                                rgba(0, 136, 255, 0.12),
                                transparent 80%
                            )
                        `,
                    }}
                />
                {/* Hover border glow */}
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                        border: "1px solid transparent",
                        background: useMotionTemplate`
                            radial-gradient(
                                350px circle at ${mouseX}px ${mouseY}px,
                                rgba(0, 136, 255, 0.45),
                                transparent 80%
                            ) border-box
                        `,
                        WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                    }}
                />

                <div className="flex flex-col h-full overflow-hidden rounded-2xl
                    border border-blue-200/70 dark:border-white/10
                    bg-white dark:bg-black/40
                    backdrop-blur-xl p-7
                    shadow-[0_2px_16px_rgba(30,80,180,0.07)] dark:shadow-xl
                    transition-all duration-300
                    group-hover:translate-y-[-3px]
                    group-hover:shadow-[0_8px_32px_rgba(0,100,255,0.14)]
                    dark:group-hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.3)]"
                >
                    <div className="flex items-start justify-between mb-5">
                        {/* Icon or Logo */}
                        {logoSrc ? (
                            <div className="relative w-[78px] h-[78px] flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                {/* Light mode logo */}
                                <Image
                                    src={logoSrc}
                                    alt={title}
                                    fill
                                    sizes="78px"
                                    className={`object-contain ${logoSrcDark ? "block dark:hidden" : ""}`}
                                />
                                {/* Dark mode logo (only if provided) */}
                                {logoSrcDark && (
                                    <Image
                                        src={logoSrcDark}
                                        alt={title}
                                        fill
                                        sizes="78px"
                                        className="object-contain hidden dark:block"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="relative rounded-xl
                                bg-blue-500/10 dark:bg-blue-500/10
                                border border-blue-500/20 dark:border-transparent
                                p-3.5 text-blue-600 dark:text-blue-400
                                group-hover:text-blue-500 dark:group-hover:text-blue-300
                                transition-colors
                                shadow-none group-hover:shadow-[0_0_12px_rgba(0,136,255,0.3)]"
                            >
                                <Icon size={26} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        )}

                        {/* Status badge */}
                        {status === "active" ? (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full
                                bg-emerald-500/10 text-emerald-600 dark:text-emerald-400
                                border border-emerald-500/20">
                                {t("active")}
                            </span>
                        ) : (
                            <span className="text-xs font-semibold px-3 py-1.5 rounded-full
                                bg-muted text-muted-foreground
                                border border-border">
                                {t("coming_soon")}
                            </span>
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-2.5
                        group-hover:text-transparent
                        group-hover:bg-clip-text
                        group-hover:bg-gradient-to-r
                        group-hover:from-blue-500
                        group-hover:to-cyan-400
                        transition-all duration-300"
                    >
                        {title}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-5 flex-grow">
                        {description}
                    </p>

                    <div className="mt-auto flex items-center justify-between
                        text-blue-500 dark:text-blue-400
                        opacity-0 group-hover:opacity-100
                        transition-all duration-300
                        transform translate-x-[-8px] group-hover:translate-x-0"
                    >
                        <span className="text-xs font-bold tracking-wide uppercase">{tCommon("details")}</span>
                        <span className="text-lg group-hover:translate-x-1 transition-transform duration-300">→</span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
