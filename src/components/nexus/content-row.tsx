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
                        /* Badge (e.g. unread count) — gradient circle */
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                            style={{
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                boxShadow: "0 4px 16px rgba(43,62,232,0.50)",
                            }}
                        >
                            {badge}
                        </div>
                    ) : (
                        /* Accent bar — gradient */
                        <div
                            className="w-1 h-5 rounded-full"
                            style={{
                                background: "linear-gradient(180deg,#2B3EE8,#00CEC8)",
                                boxShadow: "0 0 12px rgba(43,62,232,0.6)",
                            }}
                        />
                    )}
                    <h3 className="text-lg md:text-xl font-bold tracking-tight text-white">
                        {title}
                        {subtitle && (
                            <span className="text-sm font-normal ml-2" style={{ color: "#4a5a8a" }}>
                                ({subtitle})
                            </span>
                        )}
                    </h3>
                </div>

                {onSeeAll && (
                    <button
                        onClick={onSeeAll}
                        className="flex items-center gap-1 text-xs font-bold transition-opacity duration-150 hover:opacity-80 group/btn nx-gradient-text"
                    >
                        Barchasini ko'rish
                        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-150" style={{ color: "#00CEC8" }} />
                    </button>
                )}
            </div>

            {/* Left scroll button */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:block opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => scroll("left")}
                    className="w-10 h-10 -ml-5 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-200"
                    style={{
                        background: "rgba(6,11,26,0.90)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(43,62,232,0.35)",
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
                        (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(6,11,26,0.90)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.35)";
                    }}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Right scroll button */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:block opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => scroll("right")}
                    className="w-10 h-10 -mr-5 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-200"
                    style={{
                        background: "rgba(6,11,26,0.90)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(43,62,232,0.35)",
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,#2B3EE8,#00CEC8)";
                        (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(6,11,26,0.90)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.35)";
                    }}
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
