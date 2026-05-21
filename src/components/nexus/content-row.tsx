"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ContentRowProps {
    title: string;
    subtitle?: string;
    badge?: string | number;
    onSeeAll?: () => void;
    children: React.ReactNode;
}

export function ContentRow({ title, subtitle, badge, onSeeAll, children }: ContentRowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: "left" | "right") => {
        if (!scrollRef.current) return;
        const { scrollLeft, clientWidth } = scrollRef.current;
        scrollRef.current.scrollTo({
            left: dir === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8,
            behavior: "smooth",
        });
    };

    return (
        <section className="relative group/row mb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-3">
                    {badge ? (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary/30">
                            {badge}
                        </div>
                    ) : (
                        <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                    )}
                    <h3 className="text-lg md:text-xl font-bold tracking-tight">
                        {title}
                        {subtitle && (
                            <span className="text-sm font-normal text-gray-500 ml-2">({subtitle})</span>
                        )}
                    </h3>
                </div>

                {onSeeAll && (
                    <button
                        onClick={onSeeAll}
                        className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors group/btn"
                    >
                        Barchasini ko'rish
                        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-150" />
                    </button>
                )}
            </div>

            {/* Left scroll button */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:block opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => scroll("left")}
                    className="w-10 h-10 -ml-5 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-200 text-white shadow-2xl"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Right scroll button */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:block opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => scroll("right")}
                    className="w-10 h-10 -mr-5 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-200 text-white shadow-2xl"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Scroll container */}
            <div
                ref={scrollRef}
                className="flex items-start gap-4 overflow-x-auto nx-hide-scrollbar px-1 pb-2 scroll-smooth"
            >
                {children}
                <div className="flex-shrink-0 w-4" aria-hidden />
            </div>
        </section>
    );
}
