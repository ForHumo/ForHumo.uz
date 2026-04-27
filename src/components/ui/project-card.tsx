"use client";

import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useTranslations } from "next-intl";
import { MouseEvent } from "react";

interface ProjectCardProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    status: "active" | "coming-soon";
    index?: number;
    className?: string;
}

export function ProjectCard({ title, description, href, icon: Icon, status, index = 0, className }: ProjectCardProps) {
    const t = useTranslations("Status");
    
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
            transition={{ duration: 0.6, delay: index * 0.1, type: "spring", stiffness: 100 }}
            className={cn("h-full group relative", className)}
            onMouseMove={handleMouseMove}
        >
            <Link href={href} className="block relative h-full">
                {/* Spotlight Background Effect */}
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                        background: useMotionTemplate`
                            radial-gradient(
                            600px circle at ${mouseX}px ${mouseY}px,
                            rgba(59, 130, 246, 0.15),
                            transparent 80%
                            )
                        `,
                    }}
                />
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                        border: '1px solid transparent',
                        background: useMotionTemplate`
                            radial-gradient(
                            400px circle at ${mouseX}px ${mouseY}px,
                            rgba(59, 130, 246, 0.5),
                            transparent 80%
                            ) border-box
                        `,
                        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                    }}
                />

                <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-xl transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.3)]">
                    <div className="flex items-start justify-between mb-6">
                        <div className="relative rounded-xl bg-blue-500/10 p-4 text-blue-400 group-hover:text-blue-300 transition-colors shadow-[inset_0_0_20px_rgba(59,130,246,0.1)] group-hover:shadow-[inset_0_0_30px_rgba(59,130,246,0.2),0_0_15px_rgba(59,130,246,0.4)]">
                            <Icon size={28} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        {status === "active" ? (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                {t("active")}
                            </span>
                        ) : (
                            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
                                {t("coming_soon")}
                            </span>
                        )}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-300 transition-all duration-300">
                        {title}
                    </h3>
                    <p className="text-base text-muted-foreground/80 leading-relaxed line-clamp-3 mb-6 flex-grow">
                        {description}
                    </p>

                    <div className="mt-auto flex items-center justify-between text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
                        <span className="text-sm font-bold tracking-wide uppercase">Batafsil</span>
                        <span className="text-xl group-hover:translate-x-1 transition-transform duration-300">→</span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
